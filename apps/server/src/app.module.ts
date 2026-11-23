import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ApplicationsModule } from "./applications/applications.module";
import { AuthModule } from "./auth/auth.module";
import { BroadcastModule } from "./broadcast/broadcast.module";
import { CatalogsModule } from "./catalogs/catalogs.module";
import { EventPassModule } from "./event-passes/event-pass.module";
import { FestivalModule } from "./festival/festival.module";
import { HealthModule } from "./health/health.module";
import { MailerModule } from "./mailer/mailer.module";
import { ApiExceptionFilter } from "./http/exception.filter";
import { TransformInterceptor } from "./http/transform.interceptor";
import { UserNotificationsModule } from "./inbox/user-notifications.module";
import { InnovatorsModule } from "./innovators/innovators.module";
import { JobsModule } from "./jobs/jobs.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { ParticipantsModule } from "./participants/participants.module";
import { PolesModule } from "./poles/poles.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProgrammeModule } from "./programme/programme.module";
import { CatalogueModule } from "./catalogue/catalogue.module";
import { ShowcaseModule } from "./showcase/showcase.module";
import { SpeakersModule } from "./speakers/speakers.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailerModule,
    FestivalModule,
    HealthModule,
    AuthModule,
    PolesModule,
    JobsModule,
    CatalogsModule,
    OrganizationsModule,
    InnovatorsModule,
    UserNotificationsModule,
    NotificationsModule,
    ApplicationsModule,
    SpeakersModule,
    EventPassModule,
    ParticipantsModule,
    BroadcastModule,
    ProgrammeModule,
    ShowcaseModule,
    CatalogueModule,
    AnalyticsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
