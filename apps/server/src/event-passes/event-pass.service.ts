import { Injectable, NotFoundException } from "@nestjs/common";
import type { EventPass } from "@prisma/client";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { FestivalService } from "../festival/festival.service";
import { MailerService } from "../mailer/mailer.service";
import { PrismaService } from "../prisma/prisma.service";
import { EVENT_PASS_KIND_LABELS, type EventPassKind } from "./event-pass.types";

function generateToken() {
  return randomBytes(24).toString("base64url");
}

function checkinUrl(token: string): string {
  // Staff scan badges with their phone camera; the QR opens the console's check-in desk, served under
  // /admin of the website (ADMIN_APP_URL overrides it if the console ever moves to its own domain).
  const consoleUrl = process.env.ADMIN_APP_URL ?? `${process.env.WEBSITE_ORIGIN ?? "http://localhost:4200"}/admin`;
  return `${consoleUrl}/checkin?code=${token}`;
}

async function generateQrPng(token: string): Promise<Buffer> {
  return QRCode.toBuffer(checkinUrl(token), { type: "png", width: 320, margin: 1 });
}

function stripToken(pass: EventPass): Omit<EventPass, "token"> {
  const { token: _token, ...rest } = pass;
  return rest;
}

@Injectable()
export class EventPassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly festival: FestivalService,
  ) {}

  async issue(input: { kind: EventPassKind; sourceId: string; fullName: string; email: string }): Promise<EventPass> {
    const pass = await this.prisma.eventPass.create({
      data: {
        token: generateToken(),
        kind: input.kind,
        sourceId: input.sourceId,
        fullName: input.fullName,
        email: input.email,
      },
    });
    const { pass: sentPass } = await this.sendAndRecord(pass);
    return sentPass;
  }

  /** Sends (or re-sends) the confirmation email for an existing pass and records success. */
  private async sendAndRecord(pass: EventPass): Promise<{ pass: EventPass; sent: boolean }> {
    const qrPng = await generateQrPng(pass.token);
    const festival = await this.festival.publicView();
    const website = process.env.WEBSITE_ORIGIN ?? "http://localhost:4200";
    const sent = await this.mailer.compose({
      to: pass.email,
      name: pass.fullName,
      subject: `Votre badge ${festival.shortName}`,
      preheader: `Votre badge d'accès pour ${festival.dateLabel} à ${festival.city} est en pièce jointe.`,
      title: "Votre inscription est confirmée",
      intro: [
        `Votre inscription (${EVENT_PASS_KIND_LABELS[pass.kind as EventPassKind]}) est confirmée pour le ${festival.name}.`,
        "Votre badge d'accès (code QR) est joint à cet e-mail : présentez-le à l'accueil pour être enregistré sur place. Vous pouvez aussi en faire une capture d'écran.",
      ],
      details: [
        { label: "Dates", value: festival.dateLabel },
        { label: "Lieu", value: festival.location },
        ...(festival.days.length ? [{ label: "Programme", value: festival.days.map((day) => day.label).join(" · ") }] : []),
      ],
      actions: [
        { label: "Voir le programme", url: `${website}/#programme`, primary: true },
        { label: "Mon espace", url: `${website}/mon-espace` },
      ],
      footerNote: "Vous recevez cet e-mail suite à votre inscription au festival.",
      attachments: [{ filename: "badge-fif-2026.png", content: qrPng, contentType: "image/png" }],
    });
    if (!sent) return { pass, sent: false };
    const updated = await this.prisma.eventPass.update({
      where: { id: pass.id },
      data: { emailSentAt: new Date() },
    });
    return { pass: updated, sent: true };
  }

  async getForSource(kind: EventPassKind, sourceId: string): Promise<EventPass | null> {
    return this.prisma.eventPass.findFirst({ where: { kind, sourceId } });
  }

  async getOrIssueForSource(input: {
    kind: EventPassKind;
    sourceId: string;
    fullName: string;
    email: string;
  }): Promise<EventPass> {
    const existing = await this.getForSource(input.kind, input.sourceId);
    if (!existing) return this.issue(input);
    if (!existing.emailSentAt) {
      const { pass } = await this.sendAndRecord(existing);
      return pass;
    }
    return existing;
  }

  async resendEmail(token: string): Promise<{ pass: Omit<EventPass, "token">; emailSent: boolean }> {
    const existing = await this.findByToken(token);
    const { pass, sent } = await this.sendAndRecord(existing);
    return { pass: stripToken(pass), emailSent: sent };
  }

  /** Same as resendEmail, but looked up by (kind, sourceId) so callers never need the token. */
  async resendEmailForSource(kind: EventPassKind, sourceId: string): Promise<boolean> {
    const existing = await this.prisma.eventPass.findFirst({ where: { kind, sourceId } });
    if (!existing) return false;
    const { sent } = await this.sendAndRecord(existing);
    return sent;
  }

  /** Bulk lookup of email-sent status for a batch of sources, e.g. to annotate an admin list. */
  async emailStatusForSources(kind: EventPassKind, sourceIds: string[]): Promise<Map<string, Date | null>> {
    if (!sourceIds.length) return new Map();
    const passes = await this.prisma.eventPass.findMany({
      where: { kind, sourceId: { in: sourceIds } },
      select: { sourceId: true, emailSentAt: true },
    });
    return new Map(passes.map((pass) => [pass.sourceId, pass.emailSentAt]));
  }

  async withQrCode(pass: EventPass) {
    const qrPng = await generateQrPng(pass.token);
    return { ...stripToken(pass), qrCodeDataUrl: `data:image/png;base64,${qrPng.toString("base64")}` };
  }

  private async findByToken(token: string): Promise<EventPass> {
    const pass = await this.prisma.eventPass.findUnique({ where: { token } });
    if (!pass) {
      throw new NotFoundException("Badge introuvable pour ce code.");
    }
    return pass;
  }

  async verify(token: string): Promise<Omit<EventPass, "token">> {
    return stripToken(await this.findByToken(token));
  }

  async confirmCheckIn(token: string): Promise<{ pass: Omit<EventPass, "token">; alreadyCheckedIn: boolean }> {
    const pass = await this.findByToken(token);
    if (pass.checkedInAt) {
      return { pass: stripToken(pass), alreadyCheckedIn: true };
    }
    const updated = await this.prisma.eventPass.update({
      where: { token },
      data: { checkedInAt: new Date() },
    });
    return { pass: stripToken(updated), alreadyCheckedIn: false };
  }

  async listRecentCheckIns(limit = 30): Promise<Omit<EventPass, "token">[]> {
    const passes = await this.prisma.eventPass.findMany({
      where: { checkedInAt: { not: null } },
      orderBy: { checkedInAt: "desc" },
      take: limit,
    });
    return passes.map(stripToken);
  }
}
