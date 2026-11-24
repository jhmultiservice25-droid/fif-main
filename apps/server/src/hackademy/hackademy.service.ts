import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { HackademyApplicationDto } from "./hackademy.dto";

@Injectable()
export class HackademyService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: HackademyApplicationDto, logoPath: string) {
    return this.prisma.hackademyApplication.create({
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
