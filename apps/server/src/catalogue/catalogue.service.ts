import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { MailerService } from "../mailer/mailer.service";
import { PrismaService } from "../prisma/prisma.service";
import { RateLimiter } from "../programme/rate-limiter";
import { ContactDto } from "./catalogue.dto";

const PAGE_SIZE = 24;
const PUBLISHABLE = ["NAMED", "ANONYMOUS"];

const SENDER_TYPES: Record<string, string> = {
  DONOR: "Bailleur",
  INSTITUTION: "Institution",
  COMPANY: "Entreprise",
  PARTNER: "Partenaire",
  OTHER: "Autre",
};

/**
 * Public "Parcourir les projets et solutions" (PRD-003 §6): the imported FIF selection and the projects
 * innovators chose to publish. Owner e-mail addresses never leave the server — contact goes through the relay.
 */
@Injectable()
export class CatalogueService {
  private readonly perSender = new RateLimiter(3, 60 * 60 * 1000);
  private readonly perIp = new RateLimiter(20, 24 * 60 * 60 * 1000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async solutions(query: { search?: string; sector?: string; page?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const where: Prisma.ShowcaseSolutionWhereInput = {
      active: true,
      ...(query.sector ? { sector: query.sector } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { summary: { contains: query.search, mode: "insensitive" } },
              { city: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total, sectors] = await Promise.all([
      this.prisma.showcaseSolution.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { _count: { select: { presenters: true } } },
      }),
      this.prisma.showcaseSolution.count({ where }),
      this.prisma.showcaseSolution.findMany({
        where: { active: true, sector: { not: "" } },
        distinct: ["sector"],
        select: { sector: true },
        orderBy: { sector: "asc" },
      }),
    ]);
    return {
      items: items.map((solution) => ({
        reference: solution.reference,
        name: solution.name,
        summary: solution.summary,
        sector: solution.sector,
        city: solution.city,
        teamName: solution.teamName,
        presentedAtFestival: solution._count.presenters > 0,
      })),
      sectors: sectors.map((row) => row.sector),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  async solution(reference: string) {
    const solution = await this.prisma.showcaseSolution.findFirst({
      where: { reference, active: true },
      include: { presenters: { where: { listedPublicly: true }, include: { user: { select: { name: true } } } } },
    });
    if (!solution) throw new NotFoundException("Solution introuvable.");
    return {
      reference: solution.reference,
      name: solution.name,
      summary: solution.summary,
      sector: solution.sector,
      city: solution.city,
      teamName: solution.teamName,
      website: solution.website,
      presenters: solution.presenters.map((row) => row.user.name).filter(Boolean),
      presentedAtFestival: solution.presenters.length > 0,
    };
  }

  async projects(query: { search?: string; sector?: string; page?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const where: Prisma.InnovatorProjectWhereInput = {
      status: "SUBMITTED",
      publicationConsent: { in: PUBLISHABLE },
      ...(query.sector ? { sectors: { has: query.sector } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { solution: { contains: query.search, mode: "insensitive" } },
              { problemSolved: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.innovatorProject.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { innovator: true },
      }),
      this.prisma.innovatorProject.count({ where }),
    ]);
    return { items: items.map((project) => this.projectView(project, false)), total, page, pageSize: PAGE_SIZE };
  }

  async project(id: string) {
    const project = await this.prisma.innovatorProject.findFirst({
      where: { id, status: "SUBMITTED", publicationConsent: { in: PUBLISHABLE } },
      include: { innovator: true },
    });
    if (!project) throw new NotFoundException("Projet introuvable.");
    return this.projectView(project, true);
  }

  /** Relays one message to the owner with Reply-To = sender; the owner's address is never returned. */
  async contact(dto: ContactDto, ip: string) {
    if (dto.website) return { sent: true }; // honeypot filled: silently drop
    if (!this.perSender.take(dto.senderEmail) || !this.perIp.take(ip)) {
      throw new HttpException("Trop de messages envoyés. Réessayez plus tard.", HttpStatus.TOO_MANY_REQUESTS);
    }
    const target = await this.resolveTarget(dto.targetType, dto.targetId);
    const row = await this.prisma.contactMessage.create({
      data: {
        targetType: dto.targetType,
        targetId: target.id,
        targetName: target.name,
        recipientEmail: target.email,
        senderName: dto.senderName,
        senderEmail: dto.senderEmail,
        senderOrganization: dto.senderOrganization ?? "",
        senderType: dto.senderType,
        message: dto.message,
      },
    });
    const senderLabel = `${dto.senderName}${dto.senderOrganization ? ` · ${dto.senderOrganization}` : ""}`;
    const senderType = SENDER_TYPES[dto.senderType] ?? dto.senderType;
    const delivered = await this.mailer.compose({
      to: target.email,
      name: target.ownerName,
      replyTo: dto.senderEmail,
      subject: `Un partenaire s'intéresse à « ${target.name} »`,
      preheader: `${senderLabel} souhaite échanger avec vous au sujet de « ${target.name} ».`,
      title: "Un partenaire souhaite vous contacter",
      intro: `Via le FIKIRI Innovation Festival, ${senderLabel} (${senderType}) vous écrit au sujet de « ${target.name} » :`,
      quote: { body: dto.message, author: senderLabel },
      outro: "Répondez simplement à cet e-mail : votre réponse lui parviendra directement.",
      footerNote: "Votre adresse n'a pas été communiquée : ce message vous est relayé par le festival.",
    });
    await this.mailer
      .compose({
        to: dto.senderEmail,
        name: dto.senderName,
        subject: `Votre message pour « ${target.name} »`,
        preheader: `Votre message a bien été transmis au porteur de « ${target.name} ».`,
        title: "Votre message a été transmis",
        intro: `Le porteur de « ${target.name} » a reçu votre message. Sa réponse vous parviendra directement à cette adresse.`,
        quote: { body: dto.message },
        footerNote: "Vous recevez cette copie parce que vous avez contacté un porteur depuis le catalogue du festival.",
      })
      .catch(() => false);
    if (delivered) {
      await this.prisma.contactMessage.update({ where: { id: row.id }, data: { deliveredAt: new Date() } });
    }
    if (target.ownerUserId) {
      await this.prisma.userNotification.create({
        data: {
          userId: target.ownerUserId,
          type: "CONTACT_MESSAGE",
          title: "Un partenaire vous a écrit",
          body: `${dto.senderName}${dto.senderOrganization ? ` (${dto.senderOrganization})` : ""} s'intéresse à « ${target.name} ». Le message vous a été envoyé par e-mail.`,
          href: null,
        },
      });
    }
    return { sent: true };
  }

  async adminMessages(page = 1) {
    const take = 50;
    const [items, total] = await Promise.all([
      this.prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
      this.prisma.contactMessage.count(),
    ]);
    return { items, total, page, pageSize: take };
  }

  async messagesForOwner(userId: string) {
    const profile = await this.prisma.innovatorProfile.findUnique({ where: { userId }, include: { projects: { select: { id: true } } } });
    const projectIds = profile?.projects.map((project) => project.id) ?? [];
    if (!projectIds.length) return [];
    const rows = await this.prisma.contactMessage.findMany({
      where: { targetType: "PROJECT", targetId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      targetName: row.targetName,
      senderName: row.senderName,
      senderOrganization: row.senderOrganization,
      senderType: row.senderType,
      senderEmail: row.senderEmail,
      message: row.message,
      createdAt: row.createdAt,
    }));
  }

  private async resolveTarget(type: "SOLUTION" | "PROJECT", id: string) {
    const team = process.env.CONTACT_FALLBACK_EMAIL ?? process.env.ADMIN_EMAIL ?? "";
    if (type === "SOLUTION") {
      const solution = await this.prisma.showcaseSolution.findFirst({ where: { reference: id, active: true } });
      if (!solution) throw new NotFoundException("Solution introuvable.");
      return {
        id: solution.reference,
        name: solution.name,
        email: solution.contactEmail || team,
        ownerUserId: null,
        ownerName: solution.teamName || null,
      };
    }
    const project = await this.prisma.innovatorProject.findFirst({
      where: { id, status: "SUBMITTED", publicationConsent: { in: PUBLISHABLE } },
      include: { innovator: { include: { user: true } } },
    });
    if (!project) throw new NotFoundException("Projet introuvable.");
    const email = project.innovator.email || project.innovator.user.email;
    return {
      id: project.id,
      name: project.title || "Projet",
      email,
      ownerUserId: project.innovator.userId,
      ownerName: project.innovator.displayName || null,
    };
  }

  private projectView(
    project: Prisma.InnovatorProjectGetPayload<{ include: { innovator: true } }>,
    detailed: boolean,
  ) {
    const anonymous = project.publicationConsent === "ANONYMOUS";
    return {
      id: project.id,
      title: project.title,
      summary: project.solution.slice(0, 220),
      sectors: project.sectors,
      stage: project.stage,
      city: anonymous ? "" : project.innovator.city,
      owner: anonymous ? null : project.innovator.displayName || null,
      anonymous,
      ...(detailed
        ? { problemSolved: project.problemSolved, solution: project.solution, capabilities: project.capabilities }
        : {}),
    };
  }

  private layout(content: string) {
    return `<div style="font-family: Arial, sans-serif; color:#111827; max-width:520px; margin:0 auto;">
      <h1 style="font-size:20px;">FIF 2026 — FIKIRI Innovation Festival</h1>${content}<p>L'équipe FIF 2026</p></div>`;
  }
}
