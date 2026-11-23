import type { PrismaClient } from "@prisma/client";
import { FALLBACK_OTP, otpFallbackActive } from "./otp-fallback";

export type AppAuth = Awaited<ReturnType<typeof createAuth>>;

export const AUTH = Symbol("AUTH");

/**
 * Better Auth is ESM. Nest compiles to CJS, so this factory uses dynamic import.
 */
export type SendOtp = (email: string, otp: string) => Promise<boolean>;

export async function createAuth(prisma: PrismaClient, sendOtp: SendOtp) {
  const { betterAuth } = await import("better-auth");
  const { prismaAdapter } = await import("better-auth/adapters/prisma");
  const { emailOTP } = await import("better-auth/plugins/email-otp");
  const { APIError, createAuthEndpoint, createAuthMiddleware } = await import("better-auth/api");
  const { setCookieCache, setSessionCookie } = await import("better-auth/cookies");

  /**
   * Endpoint interne de création de session.
   * Sa route HTTP doit rester bloquée dans main.ts.
   */
  const directSessionPlugin = {
    id: "internal-direct-session",
    endpoints: {
      createDirectSession: createAuthEndpoint(
        "/internal/create-direct-session",
        { method: "POST" },
        async (ctx) => {
          const userId = ctx.request.headers.get("x-internal-session-user-id");

          if (!userId) {
            throw new APIError("BAD_REQUEST", {
              message: "Identifiant utilisateur manquant.",
            });
          }

          // `dontRememberMe: false` : la session dure le temps configuré (30 jours).
          const created = await ctx.context.internalAdapter.createSession(
            userId,
            false,
          );
          const session = await ctx.context.internalAdapter.findSession(
            created.token,
          );

          if (!session) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Impossible de créer la session.",
            });
          }

          await setSessionCookie(ctx, session, false);

          if (ctx.context.options.session?.cookieCache?.enabled) {
            await setCookieCache(ctx, session, false);
          }

          return ctx.json({ success: true });
        },
      ),
    },
  };

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required.");
  }

  const port = process.env.PORT ?? "4000";
  const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`;
  const website = process.env.WEBSITE_ORIGIN ?? "http://localhost:3000";
  const admin = process.env.ADMIN_ORIGIN ?? "http://localhost:3001";

  return betterAuth({
    secret,
    baseURL,
    trustedOrigins: [website, admin],
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
    },
    plugins: [
      directSessionPlugin,
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: "hashed",
        generateOTP: () =>
          otpFallbackActive() ? FALLBACK_OTP : undefined,
        async sendVerificationOTP({ email, otp }) {
          const sent = await sendOtp(email, otp);
          if (!sent) {
            throw new Error("OTP_NOT_SENT");
          }
        },
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;

        const email = String(
          (ctx.body as { email?: unknown } | undefined)?.email ?? "",
        )
          .trim()
          .toLowerCase();

        const user = email
          ? await prisma.user.findUnique({ where: { email } })
          : null;

        if (!user || user.role !== "ADMIN") {
          throw new APIError("UNAUTHORIZED", {
            message:
              "La connexion par mot de passe est réservée à l'équipe. Utilisez Mon espace pour accéder sans mot de passe.",
          });
        }
      }),
    },
    rateLimit: {
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "USER",
          input: false,
        },
      },
    },
    /**
     * `issuer` était un champ natif de Better Auth, retiré en 1.7.7 ; la colonne reste NOT NULL en
     * base. On le redéclare ici pour qu'il continue d'être écrit. Seuls des comptes locaux
     * (mot de passe de l'équipe) existent : aucun fournisseur externe n'est configuré.
     */
    account: {
      additionalFields: {
        issuer: {
          type: "string",
          required: true,
          defaultValue: "local:credential",
          input: false,
        },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  });
}

export async function ensureStaffFromEnv(auth: AppAuth, prisma: PrismaClient) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set.");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const existing = await ctx.internalAdapter.findUserByEmail(email, {
    includeAccounts: true,
  });

  if (!existing) {
    const user = await ctx.internalAdapter.createUser(
      {
        email,
        name: "FIF Admin",
        emailVerified: true,
      },
      { method: "email-password" },
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });

    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hash,
    });
    return;
  }

  // `providerId` + `accountId` identifient déjà le compte local de façon unique.
  const credential = existing.accounts.find(
    (account) => account.providerId === "credential" && account.accountId === existing.user.id,
  );

  if (credential) {
    await prisma.account.update({
      where: { id: credential.id },
      data: { password: hash, updatedAt: new Date() },
    });
    return;
  }

  await ctx.internalAdapter.linkAccount({
    userId: existing.user.id,
    providerId: "credential",
    accountId: existing.user.id,
    password: hash,
  });
}
