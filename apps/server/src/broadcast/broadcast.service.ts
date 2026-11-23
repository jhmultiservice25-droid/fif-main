import { Injectable } from "@nestjs/common";
import { fullName } from "../campaign";
import { MailerService } from "../mailer/mailer.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  BROADCAST_AUDIENCES,
  BROADCAST_AUDIENCE_LABELS,
  type BroadcastAudience,
  type SendBroadcastDto,
} from "./broadcast.dto";

interface Recipient {
  email: string;
  name: string;
}

@Injectable()
export class BroadcastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  private async recipientsFor(audience: BroadcastAudience): Promise<Recipient[]> {
    switch (audience) {
      case "PARTICIPANT": {
        const rows = await this.prisma.participantRegistration.findMany();
        return rows.map((row) => ({ email: row.email, name: fullName(row.lastName, row.postnom, row.firstName) }));
      }
      case "SPEAKER": {
        const rows = await this.prisma.speaker.findMany({ where: { email: { not: null } } });
        return rows.map((row) => ({ email: row.email as string, name: row.name }));
      }
      case "COMMITTEE": {
        const rows = await this.prisma.committeeApplication.findMany();
        return rows.map((row) => ({ email: row.email, name: fullName(row.lastName, row.postnom, row.firstName) }));
      }
      case "VOLUNTEER": {
        const rows = await this.prisma.volunteerApplication.findMany();
        return rows.map((row) => ({ email: row.email, name: fullName(row.lastName, row.postnom, row.firstName) }));
      }
      case "INNOVATOR": {
        const rows = await this.prisma.innovatorProfile.findMany();
        return rows.map((row) => ({ email: row.email, name: row.displayName }));
      }
      case "ORGANIZATION": {
        const rows = await this.prisma.organizationProfile.findMany();
        return rows.map((row) => ({ email: row.professionalEmail, name: row.name }));
      }
    }
  }

  /** One entry per distinct address, so someone in two audiences gets a single email. */
  private async resolve(audiences: BroadcastAudience[]): Promise<Recipient[]> {
    const lists = await Promise.all([...new Set(audiences)].map((audience) => this.recipientsFor(audience)));
    const byEmail = new Map<string, Recipient>();
    for (const recipient of lists.flat()) {
      const key = recipient.email.trim().toLowerCase();
      if (key && !byEmail.has(key)) byEmail.set(key, { ...recipient, email: key });
    }
    return [...byEmail.values()];
  }

  async audiences() {
    return Promise.all(
      BROADCAST_AUDIENCES.map(async (id) => ({
        id,
        label: BROADCAST_AUDIENCE_LABELS[id],
        count: (await this.resolve([id])).length,
      })),
    );
  }

  async send(dto: SendBroadcastDto) {
    const recipients = await this.resolve(dto.audiences);
    let sent = 0;
    for (const recipient of recipients) {
      const ok = await this.mailer.compose({
        to: recipient.email,
        name: recipient.name,
        subject: dto.subject,
        preheader: dto.body.slice(0, 120),
        title: dto.subject,
        intro: dto.body,
        footerNote: "Vous recevez cet e-mail en tant qu'inscrit(e) au FIKIRI Innovation Festival.",
      });
      if (ok) sent += 1;
    }
    return { recipients: recipients.length, sent, failed: recipients.length - sent };
  }
}
