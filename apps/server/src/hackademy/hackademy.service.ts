import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { HackademyApplicationDto } from "./hackademy.dto";
import { MailerService } from "../mailer/mailer.service";

@Injectable()
export class HackademyService {
  constructor(private readonly prisma: PrismaService, private readonly mailer: MailerService) {}

  async registrationAvailability() {
    const now = new Date();
    return {
      open: now >= new Date("2026-12-10T00:00:00+01:00") && now <= new Date("2026-12-15T23:59:59+01:00"),
      full: (await this.prisma.hackademyApplication.count()) >= 20,
    };
  }


  async create(dto: HackademyApplicationDto, logoPath: string) {
    const now = new Date();
    const opensAt = new Date("2026-12-10T00:00:00+01:00");
    const closesAt = new Date("2026-12-15T23:59:59+01:00");
    if (now < opensAt || now > closesAt) {
      throw new ForbiddenException("Les candidatures HACKDEMY CTF seront ouvertes du 10 au 15 décembre 2026.");
    }
    try {
      const application = await this.prisma.$transaction(async (tx) => {
        const count = await tx.hackademyApplication.count();
        if (count >= 20) throw new ConflictException("Les 20 places d'équipe disponibles sont déjà attribuées.");
        return tx.hackademyApplication.create({
          data: {
            university: dto.university.trim(),
            city: dto.city.trim(),
            teamName: dto.teamName.trim(),
            teamLeader: dto.teamLeader.trim(),
            whatsapp: dto.whatsapp.trim(),
            email: dto.email.trim().toLowerCase(),
            memberNames: dto.memberNames.map((name) => name.trim()),
            logoPath,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      await this.sendApplicationReceipt(application);
      return application;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof ForbiddenException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034")) {
        throw new ConflictException("La candidature n’a pas pu être enregistrée : vérifiez que votre équipe n’est pas déjà inscrite et réessayez.");
      }
      throw error;
    }
  }

  private async sendApplicationReceipt(application: { teamName: string; teamLeader: string; email: string; university: string; city: string }) {
    try {
      await this.mailer.compose({
        to: application.email,
        name: application.teamLeader,
        subject: "Candidature HACKDEMY CTF 2026 reçue",
        preheader: "Nous avons bien reçu le dossier de votre équipe.",
        title: "Votre candidature a bien été reçue",
        intro: [
          "Nous confirmons la réception de votre dossier de candidature au HACKDEMY CTF 2026. Il est maintenant en attente de vérification et de validation par le comité d’organisation. Cet e-mail ne vaut pas confirmation de sélection.",
          "Le comité pourra vous recontacter via le chef d’équipe avant les qualifications. Merci de vérifier que vos coordonnées WhatsApp et e-mail restent accessibles.",
        ],
        details: [
          { label: "Équipe", value: application.teamName },
          { label: "Université / institut", value: application.university },
          { label: "Ville", value: application.city },
        ],
        actions: [{ label: "Consulter HACKDEMY CTF 2026", url: `${process.env.WEBSITE_ORIGIN ?? "https://festival.fikiri.co"}/hackademy-ctf`, primary: true }],
        outro: "Bonne chance à votre équipe !",
        footerNote: "Cet e-mail confirme uniquement la réception de votre candidature au HACKDEMY CTF 2026.",
      });
    } catch {
      // A failed confirmation email must not invalidate a successfully stored application.
    }
  }


  async adminList(page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const [items, total] = await Promise.all([
      this.prisma.hackademyApplication.findMany({
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
      this.prisma.hackademyApplication.count(),
    ]);
    return { items, total, page: safePage, pageSize: safePageSize };
  }
}
