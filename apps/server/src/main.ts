import { json, urlencoded } from "express";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { mkdir } from "node:fs/promises";
import { AppModule } from "./app.module";
import { AUTH, type AppAuth } from "./auth/auth";
import { mountDocs } from "./docs";
import { PROFILES_UPLOAD_DIR, PROFILES_URL_PREFIX } from "./http/profile-image";
import { SPEAKERS_UPLOAD_DIR } from "./speakers/speakers.controller";

async function bootstrap() {
  await mkdir(process.env.UPLOAD_DIR ?? "./data/uploads", { recursive: true });
  await mkdir(SPEAKERS_UPLOAD_DIR, { recursive: true });
  await mkdir(PROFILES_UPLOAD_DIR, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // Credentials are allowed, so the origin must be an explicit allow-list (never reflected).
  const allowedOrigins = [
    process.env.WEBSITE_ORIGIN,
    process.env.ADMIN_ORIGIN,
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useStaticAssets(SPEAKERS_UPLOAD_DIR, { prefix: "/uploads/speakers" });
  app.useStaticAssets(PROFILES_UPLOAD_DIR, { prefix: PROFILES_URL_PREFIX });

  const auth = app.get<AppAuth>(AUTH);
  const { toNodeHandler } = await import("better-auth/node");
  const handler = toNodeHandler(auth);

  const http = app.getHttpAdapter().getInstance() as {
    use: (
      fn: (
        req: { originalUrl?: string; url?: string },
        res: unknown,
        next: () => void,
      ) => unknown,
    ) => void;
  };

  http.use((req, res, next) => {
    const path = (req.originalUrl ?? req.url ?? "").split("?")[0] ?? "";

    // E-mail code routes are driven server-side by ParticipantAccessService (pending selections,
    // anti-enumeration, quota); the plugin's raw HTTP routes must not be callable directly.
    if (
      path.includes("email-otp") ||
      path.startsWith("/api/auth/internal/create-direct-session")
    ) {
      // These Better Auth endpoints are only invoked by server-side application services.
      (res as { statusCode: number; end: () => void }).statusCode = 404;
      (res as { end: () => void }).end();
      return;
    }

    if (path === "/api/auth" || path.startsWith("/api/auth/")) {
      return handler(req as never, res as never);
    }

    next();
  });

  app.use(json({ limit: "2mb" }));
  app.use(urlencoded({ extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  mountDocs(app);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}

bootstrap();
