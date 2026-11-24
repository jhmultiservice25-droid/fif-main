import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { HackademyApplicationDto } from "./hackademy.dto";

@Injectable()
export class HackademyService {
  constructor(private readonly prisma: PrismaService) {}

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
      return await this.prisma.$transaction(async (tx) => {
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
    } catch (error) {
      if (error instanceof ConflictException || error instanceof ForbiddenException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034")) {
        throw new ConflictException("La candidature n’a pas pu être enregistrée : vérifiez que votre équipe n’est pas déjà inscrite et réessayez.");
      }
      throw error;
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
