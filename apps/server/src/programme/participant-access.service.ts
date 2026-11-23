import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { AUTH, type AppAuth } from "../auth/auth";
import { FALLBACK_OTP, otpFallbackActive } from "../auth/otp-fallback";
import { fullName } from "../campaign";
import { EventPassService } from "../event-passes/event-pass.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import { ProgrammeService } from "./programme.service";
import {
  OnboardingDirectDto,
  ParticipantIdentityDto,
  PatchParticipantProfileDto,
  RegisterParticipantDto,
  StartInterestDto,
} from "./programme.dto";
import { RateLimiter } from "./rate-limiter";

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * Participant access and onboarding. New innovator/organization accounts are created directly;
 * existing accounts continue to require the e-mail OTP login flow. The public participant
 * registration endpoint remains separate and does not create an authenticated session.
 */
@Injectable()
export class ParticipantAccessService {
  private readonly logger = new Logger(ParticipantAccessService.name);
  private readonly perEmail = new RateLimiter(3, TEN_MINUTES);
  private readonly perIp = new RateLimiter(30, TEN_MINUTES);

  constructor(
    @Inject(AUTH) private readonly auth: AppAuth,
    private readonly prisma: PrismaService,
    private readonly programme: ProgrammeService,
    private readonly eventPasses: EventPassService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Crée un NOUVEAU compte innovateur/organisation puis ouvre immédiatement sa session.
   * Une adresse déjà associée à un compte ne peut jamais servir, à elle seule, à se connecter.
   */
  async onboardingDirect(dto: OnboardingDirectDto, ip: string, response: Response) {
    const email = dto.email.trim().toLowerCase();
    if (!this.perEmail.take(`onboarding-direct:${email}`) || !this.perIp.take(`onboarding-direct:${ip}`)) {
      throw new HttpException(
        "Trop de tentatives de création. Réessayez dans quelques minutes.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existingUser?.role === "ADMIN") {
      throw new BadRequestException("Cette adresse ne peut pas être utilisée ici.");
    }
    if (existingUser) {
      throw new ConflictException({
        message: "Cette adresse possède déjà un compte. Choisissez « Vous avez déjà un compte ? » pour vous connecter.",
        code: "ACCOUNT_EXISTS",
      });
    }
    /**
     * S'être inscrit au festival ne crée pas de compte : ces adresses peuvent donc ouvrir le leur
     * ici, sans code, et l'inscription existante leur est rattachée.
     */
    const registration = await this.prisma.participantRegistration.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, userId: null },
    });

    let user: { id: string; email: string; name: string; role: string };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        // Vérification dans la transaction pour éviter deux créations simultanées.
        const existing = await tx.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
        if (existing) {
          throw new ConflictException({
            message: "Cette adresse possède déjà un compte. Choisissez « Vous avez déjà un compte ? » pour vous connecter.",
            code: "ACCOUNT_EXISTS",
          });
        }

        const now = new Date();
        const name = registration
          ? fullName(registration.lastName, registration.postnom, registration.firstName)
          : email.split("@")[0] || email;
        const created = await tx.user.create({
          data: {
            id: randomUUID(),
            name,
            email,
            emailVerified: false,
            role: dto.profile,
            createdAt: now,
            updatedAt: now,
          },
        });
        if (dto.profile === "INNOVATOR") {
          // Ce que le participant a déjà saisi à l'inscription n'est pas redemandé.
          await tx.innovatorProfile.create({
            data: {
              userId: created.id,
              email,
              displayName: registration ? name : "",
              city: registration?.city ?? "",
              phone: registration?.whatsapp ?? "",
              organization: registration?.organization ?? "",
            },
          });
        } else {
          await tx.organizationProfile.create({ data: { userId: created.id, professionalEmail: email } });
        }
        if (registration) {
          await tx.participantRegistration.update({ where: { id: registration.id }, data: { userId: created.id } });
        }
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException({
          message: "Cette adresse possède déjà un compte. Choisissez « Vous avez déjà un compte ? » pour vous connecter.",
          code: "ACCOUNT_EXISTS",
        });
      }
      throw error;
    }

    await this.issueDirectSession(user.id, response);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      isNewAccount: true,
      existingProfile: user.role,
    };
  }

  private async issueDirectSession(userId: string, response: Response): Promise<string[]> {
    const result = await this.auth.api.createDirectSession({
      headers: new Headers({ "x-internal-session-user-id": userId }),
      asResponse: true,
    });
    if (!result.ok) {
      throw new ServiceUnavailableException("Impossible d'ouvrir votre espace. Réessayez.");
    }
    const cookies = result.headers.getSetCookie();
    if (cookies.length) response.setHeader("Set-Cookie", cookies);
    return cookies;
  }

  /**
   * Accès à l'espace participant avec la seule adresse e-mail, sans code (décision de l'équipe FIF,
   * 2026-11-02 : les codes arrivaient en spam et bloquaient les inscriptions).
   *
   * Conséquence assumée : connaître une adresse inscrite suffit pour ouvrir l'espace correspondant.
   * Les comptes de l'équipe (ADMIN) restent exclus et continuent de passer par la console.
   */
  async access(email: string, ip: string, response: Response) {
    const normalized = email.trim().toLowerCase();
    if (!this.perEmail.take(`access:${normalized}`) || !this.perIp.take(`access:${ip}`)) {
      throw new HttpException("Trop de tentatives. Réessayez dans quelques minutes.", HttpStatus.TOO_MANY_REQUESTS);
    }

    // `isKnown` rejette les comptes de l'équipe et nous dit si l'adresse existe.
    const known =
      (await this.isKnown(normalized)) ||
      !!(await this.prisma.pendingInterest.findUnique({ where: { email: normalized } }));
    if (!known) {
      throw new NotFoundException({
        message: "Cette adresse n'est pas encore inscrite au FIF 2026.",
        code: "UNKNOWN_EMAIL",
      });
    }

    let user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      // Inscription au festival sans compte : on le crée au premier accès.
      const registration = await this.prisma.participantRegistration.findFirst({
        where: { email: { equals: normalized, mode: "insensitive" } },
      });
      const now = new Date();
      user = await this.prisma.user.create({
        data: {
          id: randomUUID(),
          name: registration
            ? fullName(registration.lastName, registration.postnom, registration.firstName)
            : normalized.split("@")[0] || normalized,
          email: normalized,
          emailVerified: false,
          role: "USER",
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    const cookies = await this.issueDirectSession(user.id, response);
    return this.completeAccess(user, normalized, response, cookies);
  }

  /**
   * Public festival registration with NO e-mail OTP at sign-up.
   *
   * Important: the e-mail is UNVERIFIED and no authentication cookie is created.
   * Protected personal-space access continues to require the existing secure login.
   * Existing users/registrations are never altered based only on a submitted e-mail.
   *
   * This endpoint deliberately preserves the public participant-registration contract and
   * is kept separate from innovator/organization account onboarding.
   */
  async registerDirect(dto: RegisterParticipantDto, ip: string) {
    const email = dto.email.trim().toLowerCase();
    const identity = dto.identity;
    if (!identity) {
      throw new BadRequestException("Veuillez renseigner votre identité pour terminer l'inscription.");
    }
    const firstName = identity.firstName?.trim();
    const lastName = identity.lastName?.trim();
    const postnom = identity.postnom?.trim();
    const city = identity.city?.trim();
    const whatsapp = identity.whatsapp?.trim();
    if (!firstName || !lastName || !postnom || !city || !whatsapp) {
      throw new BadRequestException("Tous les champs obligatoires du participant doivent être renseignés.");
    }

    // Apply limits before any account or session changes, including repeated attempts.
    if (!this.perEmail.take(`registration:${email}`) || !this.perIp.take(`registration:${ip}`)) {
      throw new HttpException(
        "Trop de tentatives d'inscription. Réessayez dans quelques minutes.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Keep the existing visibility/admission rules; capacity is checked under locks below.
    const sessionIds = await this.programme.assertRegistrable(dto.sessionIds);
    const now = new Date();
    const duplicateMessage = "Cette adresse est déjà associée à une inscription ou un compte. Connectez-vous à Mon espace.";

    let committed: {
      userId: string;
      participantId: string;
      results: Awaited<ReturnType<ProgrammeService["joinMany"]>>;
    };
    try {
      committed = await this.prisma.$transaction(
        async (tx) => {
          // Never silently change an existing account (including STAFF/ADMIN).
          const existingUser = await tx.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
          });
          const existingParticipant = await tx.participantRegistration.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
          });
          if (existingUser || existingParticipant) {
            throw new ConflictException(duplicateMessage);
          }

          const user = await tx.user.create({
            data: {
              id: randomUUID(),
              name: `${firstName} ${lastName}`,
              email,
              emailVerified: false,
              role: "PARTICIPANT",
              createdAt: now,
              updatedAt: now,
            },
          });
          const registration = await tx.participantRegistration.create({
            data: {
              userId: user.id,
              email,
              firstName,
              lastName,
              postnom,
              city,
              whatsapp,
              organization: identity.organization?.trim() || null,
              selectedDays: [],
              selectedActivities: [],
              source: "home",
            },
          });
          const results = await this.programme.joinManyInTransaction(tx, user.id, sessionIds);

          // Clean up an abandoned OTP draft only after final data is committed.
          await tx.pendingInterest.deleteMany({ where: { email } });
          return { userId: user.id, participantId: registration.id, results };
        },
        { timeout: 20_000 },
      );
    } catch (error) {
      // Concurrent requests for the same address must be treated as a duplicate,
      // not a generic server failure.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException(duplicateMessage);
      }
      throw error;
    }

    // These side effects happen after the transaction; if they fail, registration stays valid.
    try {
      await this.notifications.received({
        kind: "PARTICIPANT",
        id: committed.participantId,
        lastName,
        postnom,
        firstName,
        choice: "Programme FIF 2026",
      });
    } catch (error) {
      this.logger.warn(`Notification d'inscription différée : ${(error as Error).message}`);
    }

    let qrCodeDataUrl: string | null = null;
    try {
      const pass = await this.participantPass(committed.participantId);
      qrCodeDataUrl = pass?.qrCodeDataUrl ?? null;
    } catch (error) {
      this.logger.error(`Badge non généré immédiatement : ${(error as Error).message}`);
    }

    return {
      registered: true,
      codeSent: false,
      emailVerified: false,
      participantId: committed.participantId,
      results: committed.results,
      qrCodeDataUrl,
      privateSpaceRequiresLogin: true,
    };
  }

  /** Step 1 of the modal: stores the draft and e-mails a code — or asks for identity for a new e-mail. */
  async startInterest(dto: StartInterestDto, ip: string) {
    const sessionIds = await this.programme.assertRegistrable(dto.sessionIds);
    const known = await this.isKnown(dto.email);
    if (!known && !dto.identity) {
      return { needsIdentity: true, codeSent: false };
    }
    await this.prisma.pendingInterest.upsert({
      where: { email: dto.email },
      create: { email: dto.email, sessionIds, identity: known ? undefined : { ...dto.identity }, source: "home" },
      update: { sessionIds, identity: known ? undefined : { ...dto.identity }, source: "home" },
    });
    await this.sendCode(dto.email, ip);
    return { needsIdentity: false, codeSent: true, ...this.fallbackHint() };
  }

  /**
   * Sign-up as innovator or organization (PRD-003 §5): a code goes to any e-mail, and the chosen profile
   * waits in PendingInterest until it is verified. Existing accounts simply sign in.
   */
  async requestOnboardingCode(email: string, profile: "INNOVATOR" | "ORGANIZATION", ip: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.role === "ADMIN") throw new BadRequestException("Cette adresse ne peut pas être utilisée ici.");
    if (!user) {
      await this.prisma.pendingInterest.upsert({
        where: { email },
        create: { email, sessionIds: [], identity: { profile }, source: "onboarding" },
        update: { identity: { profile }, source: "onboarding" },
      });
    }
    await this.sendCode(email, ip);
    return { codeSent: true, existingProfile: user?.role ?? null, ...this.fallbackHint() };
  }

  /**
   * "Mon espace" login. An unknown address is told so plainly: pretending a code was sent only left
   * people waiting for an e-mail that never comes.
   */
  async requestCode(email: string, ip: string) {
    const known = (await this.isKnown(email)) || !!(await this.prisma.pendingInterest.findUnique({ where: { email } }));
    if (!known) {
      // Still counted, so the endpoint cannot be used to test addresses in bulk.
      if (!this.perIp.take(ip)) {
        throw new HttpException("Trop de tentatives. Réessayez dans quelques minutes.", HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new NotFoundException({
        message: "Cette adresse n'est pas encore inscrite au FIF 2026.",
        code: "UNKNOWN_EMAIL",
      });
    }
    await this.sendCode(email, ip);
    return { codeSent: true, ...this.fallbackHint() };
  }

  /**
   * Verifies the code, opens the session (cookie forwarded from Better Auth) and applies everything
   * that was waiting: participant record, session registrations and badge — in one request.
   */
  async verify(email: string, otp: string, request: Request, response: Response) {
    const { fromNodeHeaders } = await import("better-auth/node");
    const result = await this.auth.api.signInEmailOTP({
      body: { email, otp },
      headers: fromNodeHeaders(request.headers),
      asResponse: true,
    });
    if (!result.ok) {
      throw new BadRequestException("Code invalide ou expiré.");
    }
    const signInCookies = result.headers.getSetCookie();
    response.setHeader("Set-Cookie", signInCookies);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException("Compte introuvable.");
    return this.completeAccess(user, email, response, signInCookies);
  }

  /**
   * Travail commun aux deux entrées (code e-mail ou accès direct) une fois la session ouverte :
   * montée en rôle, rattachement de l'inscription, activités mises de côté et badge.
   */
  private async completeAccess(
    user: { id: string; email: string; name: string; role: string },
    email: string,
    response: Response,
    signInCookies: string[],
  ) {
    const pending = await this.prisma.pendingInterest.findUnique({ where: { email } });
    const stored = (pending?.identity ?? null) as unknown as (Partial<ParticipantIdentityDto> & { profile?: string }) | null;
    const profileIntent = stored?.profile === "INNOVATOR" || stored?.profile === "ORGANIZATION" ? stored.profile : null;
    const identity = stored?.firstName ? (stored as ParticipantIdentityDto) : null;

    let participantId: string | null = null;
    let role = user.role;
    let isNewAccount = false;
    if (role === "USER" && profileIntent) {
      // Sign-up from /rejoindre/innovateur or /rejoindre/organisation: the profile form comes right after.
      role = profileIntent;
      isNewAccount = true;
      await this.prisma.user.update({ where: { id: user.id }, data: { role, emailVerified: true } });
      if (role === "INNOVATOR") {
        await this.prisma.innovatorProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, email }, update: {} });
      } else {
        await this.prisma.organizationProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, professionalEmail: email },
          update: {},
        });
      }
    } else if (role === "USER" || role === "PARTICIPANT") {
      participantId = await this.ensureParticipant(user.id, email, identity);
      // Rien à rattacher : la personne entre quand même, son espace est simplement vide.
      if (participantId && role === "USER") {
        role = "PARTICIPANT";
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role, name: identity ? `${identity.firstName} ${identity.lastName}` : user.name, emailVerified: true },
        });
      }
    }

    if (role !== user.role) {
      // The new session cookie cached the role Better Auth gave the account ("USER"): refresh it now,
      // otherwise the participant space would answer 403 until the cache expires.
      response.setHeader("Set-Cookie", await this.refreshedCookies(signInCookies));
    }

    const results = pending?.sessionIds.length ? await this.programme.joinMany(user.id, pending.sessionIds) : [];
    if (pending) {
      await this.prisma.pendingInterest.delete({ where: { email } });
    }

    const pass = participantId ? await this.participantPass(participantId) : null;
    return {
      user: { id: user.id, email: user.email, name: user.name, role },
      isNewParticipant: !!identity,
      isNewAccount: isNewAccount || !!identity,
      results,
      qrCodeDataUrl: pass?.qrCodeDataUrl ?? null,
    };
  }

  /** While no e-mail provider is configured, the UI must tell people which code to type. */
  private fallbackHint() {
    return otpFallbackActive() ? { fallbackCode: FALLBACK_OTP } : {};
  }

  /** Re-reads the session bypassing the cookie cache and merges the refreshed cookies over the given ones. */
  private async refreshedCookies(cookies: string[]) {
    const { fromNodeHeaders } = await import("better-auth/node");
    const cookieHeader = cookies.map((cookie) => cookie.split(";")[0]).join("; ");
    const refreshed = await this.auth.api.getSession({
      headers: fromNodeHeaders({ cookie: cookieHeader }),
      query: { disableCookieCache: true },
      asResponse: true,
    });
    const merged = new Map(cookies.map((cookie) => [cookie.split("=")[0], cookie]));
    for (const cookie of refreshed.headers.getSetCookie()) merged.set(cookie.split("=")[0], cookie);
    return [...merged.values()];
  }

  async profile(userId: string) {
    const registration = await this.prisma.participantRegistration.findUnique({ where: { userId } });
    if (!registration) throw new NotFoundException("Profil participant introuvable.");
    return {
      id: registration.id,
      firstName: registration.firstName,
      lastName: registration.lastName,
      postnom: registration.postnom,
      fullName: fullName(registration.lastName, registration.postnom, registration.firstName),
      email: registration.email,
      city: registration.city,
      whatsapp: registration.whatsapp,
      organization: registration.organization,
    };
  }

  async patchProfile(userId: string, dto: PatchParticipantProfileDto) {
    await this.prisma.participantRegistration.update({
      where: { userId },
      data: { city: dto.city, whatsapp: dto.whatsapp },
    });
    return this.profile(userId);
  }

  /**
   * A participant with a project becomes an innovator in one step: same account, same badge,
   * innovator profile pre-filled from what they already gave us.
   */
  async becomeInnovator(userId: string, request: Request, response: Response) {
    const [user, registration] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.participantRegistration.findUnique({ where: { userId } }),
    ]);
    if (user.role !== "PARTICIPANT" || !registration) {
      throw new BadRequestException("Seuls les participants peuvent devenir innovateurs depuis cet espace.");
    }
    await this.prisma.$transaction([
      this.prisma.innovatorProfile.upsert({
        where: { userId },
        create: {
          userId,
          displayName: `${registration.firstName} ${registration.lastName}`,
          organization: registration.organization ?? "",
          city: registration.city,
          phone: registration.whatsapp,
          email: registration.email,
        },
        update: {},
      }),
      this.prisma.user.update({ where: { id: userId }, data: { role: "INNOVATOR" } }),
    ]);
    // The session cookie caches the role for a few minutes; re-read it so the new role applies right away.
    const { fromNodeHeaders } = await import("better-auth/node");
    const refreshed = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
      query: { disableCookieCache: true },
      asResponse: true,
    });
    const cookies = refreshed.headers.getSetCookie();
    if (cookies.length) response.setHeader("Set-Cookie", cookies);
    return { role: "INNOVATOR" };
  }

  /** A participant who represents an organization switches profile; badge and programme are kept. */
  async becomeOrganization(userId: string, request: Request, response: Response) {
    const [user, registration] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.participantRegistration.findUnique({ where: { userId } }),
    ]);
    if (user.role !== "PARTICIPANT" || !registration) {
      throw new BadRequestException("Seuls les participants peuvent représenter une organisation depuis cet espace.");
    }
    await this.prisma.$transaction([
      this.prisma.organizationProfile.upsert({
        where: { userId },
        create: {
          userId,
          name: registration.organization ?? "",
          city: registration.city,
          contactName: `${registration.firstName} ${registration.lastName}`,
          phone: registration.whatsapp,
          professionalEmail: registration.email,
        },
        update: {},
      }),
      this.prisma.user.update({ where: { id: userId }, data: { role: "ORGANIZATION" } }),
    ]);
    const { fromNodeHeaders } = await import("better-auth/node");
    const refreshed = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
      query: { disableCookieCache: true },
      asResponse: true,
    });
    const cookies = refreshed.headers.getSetCookie();
    if (cookies.length) response.setHeader("Set-Cookie", cookies);
    return { role: "ORGANIZATION" };
  }

  /** Badge of an attendee who registered as a participant (kept if they later become an innovator). */
  async passForParticipantUser(userId: string) {
    const registration = await this.prisma.participantRegistration.findUnique({ where: { userId } });
    return registration ? this.participantPass(registration.id) : null;
  }

  async participantPassForUser(userId: string) {
    const registration = await this.prisma.participantRegistration.findUnique({ where: { userId } });
    if (!registration) throw new NotFoundException("Profil participant introuvable.");
    return this.participantPass(registration.id);
  }

  private async participantPass(participantId: string) {
    const row = await this.prisma.participantRegistration.findUniqueOrThrow({ where: { id: participantId } });
    const pass = await this.eventPasses.getOrIssueForSource({
      kind: "PARTICIPANT",
      sourceId: row.id,
      fullName: fullName(row.lastName, row.postnom, row.firstName),
      email: row.email,
    });
    return this.eventPasses.withQrCode(pass);
  }

  /** Links (or creates) the participant record for this account and converts legacy activity picks. */
  private async ensureParticipant(userId: string, email: string, identity: ParticipantIdentityDto | null) {
    const linked = await this.prisma.participantRegistration.findUnique({ where: { userId } });
    if (linked) return linked.id;

    const legacy = await this.prisma.participantRegistration.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, userId: null },
      orderBy: { createdAt: "desc" },
    });
    if (legacy) {
      await this.prisma.participantRegistration.update({ where: { id: legacy.id }, data: { userId } });
      await this.convertLegacySelections(userId, legacy.selectedActivities);
      return legacy.id;
    }
    if (!identity) return null;

    const created = await this.prisma.participantRegistration.create({
      data: {
        userId,
        email,
        firstName: identity.firstName,
        lastName: identity.lastName,
        postnom: identity.postnom,
        city: identity.city,
        whatsapp: identity.whatsapp,
        organization: identity.organization ?? null,
        selectedDays: [],
        selectedActivities: [],
        source: "home",
      },
    });
    await this.notifications.received({
      kind: "PARTICIPANT",
      id: created.id,
      lastName: created.lastName,
      postnom: created.postnom,
      firstName: created.firstName,
      choice: "Programme FIF 2026",
    });
    return created.id;
  }

  private async convertLegacySelections(userId: string, codes: string[]) {
    if (!codes.length) return;
    const sessions = await this.prisma.programSession.findMany({ where: { code: { in: codes } } });
    for (const session of sessions) {
      if (session.admission === "NONE" || session.status !== "SCHEDULED") continue;
      await this.programme.join(userId, session.id).catch((error: Error) => {
        this.logger.warn(`Sélection historique ignorée (${session.code}) : ${error.message}`);
      });
    }
  }

  private async isKnown(email: string) {
    const [user, registration] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.participantRegistration.findFirst({ where: { email: { equals: email, mode: "insensitive" } } }),
    ]);
    if (user?.role === "ADMIN") {
      // Staff never sign in with an e-mail code.
      throw new BadRequestException({
        message: "Ce compte fait partie de l'équipe d'organisation : connectez-vous sur la console.",
        code: "STAFF_ACCOUNT",
      });
    }
    return !!user || !!registration;
  }

  private async sendCode(email: string, ip: string) {
    if (!this.perEmail.take(email) || !this.perIp.take(ip)) {
      throw new HttpException("Trop de demandes de code. Réessayez dans quelques minutes.", HttpStatus.TOO_MANY_REQUESTS);
    }
    try {
      await this.auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
    } catch (error) {
      this.logger.error(`Code non envoyé à ${email} : ${(error as Error).message}`);
      throw new ServiceUnavailableException("Le code n'a pas pu être envoyé. Réessayez dans un instant.");
    }
  }
}
