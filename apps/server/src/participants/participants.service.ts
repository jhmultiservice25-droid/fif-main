import { Injectable, NotFoundException } from "@nestjs/common";
import { fullName } from "../campaign";
import { EventPassService } from "../event-passes/event-pass.service";
import { MarketplaceListQueryDto } from "../organizations/organizations.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ParticipantRegistrationDto } from "./participants.dto";

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPasses: EventPassService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: ParticipantRegistrationDto) {
    const row = await this.prisma.participantRegistration.create({
      data: {
        lastName: dto.lastName,
        postnom: dto.postnom,
        firstName: dto.firstName,
        city: dto.city,
        whatsapp: dto.whatsapp,
        email: dto.email,
        organization: dto.organization || null,
        selectedDays: dto.selectedDays,
        selectedActivities: dto.selectedActivities,
      },
    });
    const name = fullName(row.lastName, row.postnom, row.firstName);
    const pass = await this.eventPasses.issue({
      kind: "PARTICIPANT",
      sourceId: row.id,
      fullName: name,
      email: row.email,
    });
    const { qrCodeDataUrl } = await this.eventPasses.withQrCode(pass);
    await this.notifications.received({
      kind: "PARTICIPANT",
      id: row.id,
      lastName: row.lastName,
      postnom: row.postnom,
      firstName: row.firstName,
      choice: `${row.selectedDays.length} jour(s)`,
    });
    return { ...row, qrCodeDataUrl };
  }

  async getBadge(id: string) {
    const row = await this.prisma.participantRegistration.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("Inscription participant introuvable.");
    }
    const name = fullName(row.lastName, row.postnom, row.firstName);
    const pass = await this.eventPasses.getOrIssueForSource({
      kind: "PARTICIPANT",
      sourceId: row.id,
      fullName: name,
      email: row.email,
    });
    const { qrCodeDataUrl } = await this.eventPasses.withQrCode(pass);
    return {
      id: row.id,
      fullName: name,
      organization: row.organization,
      selectedDays: row.selectedDays,
      selectedActivities: row.selectedActivities,
      badgeEligible: true,
      qrCodeDataUrl,
    };
  }

  async adminList(query: MarketplaceListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.participantRegistration.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.participantRegistration.count(),
    ]);

    const emailStatus = await this.eventPasses.emailStatusForSources(
      "PARTICIPANT",
      items.map((row) => row.id),
    );

    return {
      items: items.map((row) => ({
        id: row.id,
        fullName: fullName(row.lastName, row.postnom, row.firstName),
        email: row.email,
        whatsapp: row.whatsapp,
        city: row.city,
        organization: row.organization,
        selectedDays: row.selectedDays,
        emailSentAt: emailStatus.get(row.id) ?? null,
        createdAt: row.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async resendEmail(id: string): Promise<boolean> {
    const row = await this.prisma.participantRegistration.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("Inscription participant introuvable.");
    }
    return this.eventPasses.resendEmailForSource("PARTICIPANT", id);
  }
}
