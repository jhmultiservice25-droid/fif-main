import { Global, Module } from "@nestjs/common";
import { MailerModule } from "../mailer/mailer.module";
import { MailerService } from "../mailer/mailer.service";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "../prisma/prisma.service";
import { AUTH, createAuth } from "./auth";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { MeController } from "./me.controller";
import { RegisterController } from "./register.controller";
import { RolesGuard } from "./roles.guard";
import { SessionAuthGuard } from "./session.guard";

@Global()
@Module({
  imports: [PrismaModule, MailerModule],
  controllers: [AuthController, RegisterController, MeController],
  providers: [
    {
      provide: AUTH,
      useFactory: (prisma: PrismaService, mailer: MailerService) =>
        createAuth(prisma, async (email, otp) => {
          const user = await prisma.user.findUnique({ where: { email } });
          return mailer.sendLoginCode(email, otp, user?.name);
        }),
      inject: [PrismaService, MailerService],
    },
    AuthService,
    SessionAuthGuard,
    RolesGuard,
  ],
  exports: [AUTH, SessionAuthGuard, RolesGuard],
})
export class AuthModule {}
