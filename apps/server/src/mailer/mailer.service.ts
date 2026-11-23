import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { FestivalService } from "../festival/festival.service";
import { IComposeEmail, IEmailBrand, renderEmail } from "./email-template";

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
  /** Where replies go (contact relay: the partner who wrote, never the owner's own address). */
  replyTo?: string;
}

export interface ComposedMailInput extends Omit<SendMailInput, "html">, IComposeEmail {}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  private readonly from = process.env.MAIL_FROM ?? "FIF 2026 <no-reply@fikiri.cd>";

  constructor(private readonly festival: FestivalService) {}

  /** Renders the shared layout (brand header, "Bonjour X,", signed footer) and sends it. */
  async compose(input: ComposedMailInput): Promise<boolean> {
    const { to, subject, attachments, replyTo, ...content } = input;
    return this.send({ to, subject, attachments, replyTo, html: renderEmail(content, await this.brand()) });
  }

  async brand(): Promise<IEmailBrand> {
    const festival = await this.festival.publicView();
    return {
      shortName: festival.shortName,
      name: festival.name,
      dateLabel: festival.dateLabel,
      location: festival.location,
      websiteUrl: process.env.WEBSITE_ORIGIN ?? "http://localhost:4200",
    };
  }

  /**
   * One-time sign-in code. Without RESEND_API_KEY the code is the fixed fallback, so there is nothing
   * to send; outside production it is also logged so the flow can be tested locally.
   */
  async sendLoginCode(email: string, otp: string, name?: string | null): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY absent : code de connexion fixe utilisé pour ${email}.`);
      if (process.env.NODE_ENV !== "production") this.logger.warn(`[dev] Code de connexion pour ${email} : ${otp}`);
      return true;
    }
    const festival = await this.festival.publicView();
    return this.compose({
      to: email,
      name,
      subject: `${otp} — votre code de connexion ${festival.shortName}`,
      preheader: `Votre code de connexion est ${otp}. Il expire dans 10 minutes.`,
      title: "Votre code de connexion",
      intro: "Saisissez ce code dans la page de connexion pour accéder à votre espace :",
      highlight: { value: otp, caption: "Valable 10 minutes" },
      outro: "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
      footerNote: "Ce code vous a été envoyé parce qu'une connexion a été demandée avec cette adresse.",
    });
  }

  /** Returns whether the email was actually sent (false if RESEND_API_KEY is missing or the send failed). */
  async send(input: SendMailInput): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY manquant, e-mail à ${input.to} non envoyé ("${input.subject}").`);
      return false;
    }
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo,
      attachments: input.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });
    if (error) {
      this.logger.error(`Échec d'envoi à ${input.to}: ${error.message}`);
      return false;
    }
    return true;
  }
}
