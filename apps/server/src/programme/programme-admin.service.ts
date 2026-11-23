import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { fullName } from "../campaign";
import { MailerService } from "../mailer/mailer.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AddAttendeeDto,
  CheckSessionDto,
  DecideRequestsDto,
  RoomInputDto,
  SessionInputDto,
  UpdateSessionDto,
} from "./programme-admin.dto";
import { findConflicts, IConflict } from "./programme-conflicts";
import { FestivalService } from "../festival/festival.service";
import { kinshasaDay } from "./programme.seed";

const ACTIVE = ["REGISTERED", "PENDING", "WAITLISTED"];
/** Fields whose change is announced to registrants (PRD-002 §5.4). */
const TRACKED = ["startsAt", "endsAt", "roomId", "status", "admission", "visibility"] as const;
const DAY_START = "08:00";
const DAY_END = "23:00";

const adminInclude = {
  room: { select: { id: true, name: true, color: true } },
  speakers: { include: { speaker: { select: { id: true, name: true, title: true, photo: true } } } },
} satisfies Prisma.ProgramSessionInclude;

type AdminSessionRow = Prisma.ProgramSessionGetPayload<{ include: typeof adminInclude }>;

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kinshasa" });
const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Kinshasa" });

@Injectable()
export class ProgrammeAdminService {
  private readonly logger = new Logger(ProgrammeAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly festival: FestivalService,
  ) {}

  // --- Read ------------------------------------------------------------------

  /** Everything the calendar needs in one call: days, rooms, all sessions with counts and conflicts. */
  async overview() {
    const [days, rooms, sessions, counts] = await Promise.all([
      this.festival.days(),
      this.prisma.room.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
      this.prisma.programSession.findMany({ include: adminInclude, orderBy: [{ startsAt: "asc" }, { title: "asc" }] }),
      this.prisma.sessionRegistration.groupBy({ by: ["sessionId", "status"], _count: { _all: true } }),
    ]);
    const tally = new Map<string, Record<string, number>>();
    for (const row of counts) {
      const entry = tally.get(row.sessionId) ?? {};
      entry[row.status] = row._count._all;
      tally.set(row.sessionId, entry);
    }
    const existing = sessions.map((session) => this.toExisting(session));
    const speakerNames = this.speakerNames(sessions);
    return {
      days,
      rooms,
      sessions: sessions.map((session) => {
        const counts = tally.get(session.id) ?? {};
        const conflicts =
          session.status === "CANCELLED"
            ? []
            : findConflicts(
                { ...this.toExisting(session), capacity: session.capacity },
                existing,
                speakerNames,
                counts["REGISTERED"] ?? 0,
              );
        return this.toAdminView(session, counts, conflicts);
      }),
    };
  }

  async check(dto: CheckSessionDto) {
    const candidate = await this.candidate(dto, dto.id);
    return { conflicts: await this.conflictsFor(candidate) };
  }

  async history(sessionId: string) {
    await this.findSession(sessionId);
    const changes = await this.prisma.sessionChange.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const actors = await this.prisma.user.findMany({
      where: { id: { in: changes.map((change) => change.actorId).filter((id): id is string => !!id) } },
      select: { id: true, name: true, email: true },
    });
    const actorName = new Map(actors.map((actor) => [actor.id, actor.name || actor.email]));
    return changes.map((change) => ({
      id: change.id,
      kind: change.kind,
      before: change.before,
      after: change.after,
      actor: change.actorId ? (actorName.get(change.actorId) ?? null) : null,
      at: change.createdAt,
    }));
  }

  // --- Write -----------------------------------------------------------------

  async create(dto: SessionInputDto, actorId: string) {
    const candidate = await this.candidate(dto);
    await this.assertNoBlocking(candidate, dto.acknowledgeConflicts);
    const session = await this.prisma.programSession.create({
      data: {
        ...this.sessionData(dto),
        speakers: { create: (dto.speakerIds ?? []).map((speakerId) => ({ speakerId })) },
      },
    });
    await this.recordChange(session.id, actorId, "CREATED", {}, { title: session.title }, false);
    return this.adminSession(session.id);
  }

  /** Full update with optimistic locking; tracked changes are logged and announced to registrants. */
  async update(sessionId: string, dto: UpdateSessionDto, actorId: string) {
    const current = await this.findSession(sessionId);
    if (current.version !== dto.version) {
      throw new ConflictException({
        message: "Cette session a été modifiée entre-temps par un autre administrateur. Rechargez pour voir sa version actuelle.",
        code: "STALE_VERSION",
      });
    }
    const candidate = await this.candidate(dto, sessionId);
    await this.assertNoBlocking(candidate, dto.acknowledgeConflicts);

    const data = this.sessionData(dto);
    const updated = await this.prisma.programSession.update({
      where: { id: sessionId, version: dto.version },
      data: {
        ...data,
        version: { increment: 1 },
        speakers: { deleteMany: {}, create: (dto.speakerIds ?? []).map((speakerId) => ({ speakerId })) },
      },
      include: { room: true },
    });

    if (dto.capacity != null) {
      await this.overflowToWaitlist(sessionId, dto.capacity);
    }
    const { before, after } = this.diff(current, updated);
    if (Object.keys(after).length) {
      await this.recordChange(sessionId, actorId, "UPDATED", before, after, true, !!dto.acknowledgeConflicts);
    }
    return this.adminSession(sessionId);
  }

  async cancel(sessionId: string, reason: string | undefined, actorId: string) {
    const current = await this.findSession(sessionId);
    if (current.status === "CANCELLED") return this.adminSession(sessionId);
    const updated = await this.prisma.programSession.update({
      where: { id: sessionId },
      data: { status: "CANCELLED", cancelReason: reason || null, version: { increment: 1 } },
      include: { room: true },
    });
    await this.recordChange(sessionId, actorId, "CANCELLED", { status: current.status }, { status: "CANCELLED", reason: reason ?? null }, true);
    await this.emailRegistrants(updated.id, {
      subject: `Annulation : ${updated.title}`,
      preheader: `« ${updated.title} » n'aura pas lieu. Votre programme a été mis à jour.`,
      title: "Une session de votre programme est annulée",
      intro: [
        `La session « ${updated.title} », prévue ${this.when(updated.startsAt)}, est annulée.`,
        ...(reason ? [`Motif : ${reason}`] : []),
        "Le reste de votre programme est inchangé. Vous pouvez choisir une autre session depuis votre espace.",
      ],
    });
    return this.adminSession(sessionId);
  }

  async restore(sessionId: string, actorId: string) {
    const current = await this.findSession(sessionId);
    if (current.status !== "CANCELLED") return this.adminSession(sessionId);
    await this.prisma.programSession.update({
      where: { id: sessionId },
      data: { status: "SCHEDULED", cancelReason: null, version: { increment: 1 } },
    });
    await this.recordChange(sessionId, actorId, "UPDATED", { status: "CANCELLED" }, { status: "SCHEDULED" }, true);
    return this.adminSession(sessionId);
  }

  async remove(sessionId: string) {
    await this.findSession(sessionId);
    const held = await this.prisma.sessionRegistration.count({ where: { sessionId, status: { in: ACTIVE } } });
    if (held) {
      throw new BadRequestException(`${held} personne(s) sont inscrites : annulez la session plutôt que de la supprimer.`);
    }
    await this.prisma.programSession.delete({ where: { id: sessionId } });
    return { deleted: true };
  }

  async duplicate(sessionId: string, actorId: string) {
    const source = await this.prisma.programSession.findUnique({ where: { id: sessionId }, include: { speakers: true } });
    if (!source) throw new NotFoundException("Session introuvable.");
    const copy = await this.prisma.programSession.create({
      data: {
        title: `${source.title} (copie)`,
        description: source.description,
        type: source.type,
        startsAt: source.startsAt,
        endsAt: source.endsAt,
        roomId: null,
        visibility: source.visibility,
        admission: source.admission,
        capacity: source.capacity,
        waitlistEnabled: source.waitlistEnabled,
        speakers: { create: source.speakers.map(({ speakerId }) => ({ speakerId })) },
      },
    });
    await this.recordChange(copy.id, actorId, "CREATED", {}, { title: copy.title, from: source.title }, false);
    return this.adminSession(copy.id);
  }

  // --- Attendees & requests ---------------------------------------------------

  async attendees(sessionId: string) {
    await this.findSession(sessionId);
    const rows = await this.prisma.sessionRegistration.findMany({
      where: { sessionId, status: { not: "CANCELLED" } },
      include: { user: { select: { id: true, name: true, email: true, role: true, participant: true } } },
      orderBy: [{ status: "asc" }, { requestedAt: "asc" }],
    });
    return rows.map((row) => this.attendeeView(row));
  }

  async attendeesCsv(sessionId: string) {
    const session = await this.findSession(sessionId);
    const rows = await this.attendees(sessionId);
    const escape = (value: string | null | undefined) => `"${(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Nom", "E-mail", "Ville", "Organisation", "Statut", "Demandé le"].map(escape).join(","),
      ...rows.map((row) =>
        [row.name, row.email, row.city, row.organization, row.status, row.requestedAt.toISOString()].map(escape).join(","),
      ),
    ];
    return { filename: `participants-${session.code ?? session.id}.csv`, content: `﻿${lines.join("\n")}` };
  }

  /** The only way into invite-only sessions; admins also bypass approval and capacity. */
  async addAttendee(sessionId: string, dto: AddAttendeeDto) {
    await this.findSession(sessionId);
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.role === "ADMIN" || user.role === "USER") {
      throw new NotFoundException("Aucun participant, innovateur ou organisation avec cette adresse.");
    }
    await this.prisma.sessionRegistration.upsert({
      where: { sessionId_userId: { sessionId, userId: user.id } },
      create: { sessionId, userId: user.id, status: "REGISTERED", decidedAt: new Date() },
      update: { status: "REGISTERED", decidedAt: new Date(), note: null },
    });
    return this.attendees(sessionId);
  }

  async removeAttendee(sessionId: string, userId: string) {
    const session = await this.findSession(sessionId);
    const row = await this.prisma.sessionRegistration.findUnique({ where: { sessionId_userId: { sessionId, userId } } });
    if (!row || row.status === "CANCELLED") throw new NotFoundException("Inscription introuvable.");
    await this.prisma.sessionRegistration.update({ where: { id: row.id }, data: { status: "CANCELLED" } });
    await this.notify([userId], "SESSION_REMOVED", "Inscription retirée", `Votre inscription à « ${session.title} » a été retirée par l'organisation.`);
    return this.attendees(sessionId);
  }

  async requests() {
    const rows = await this.prisma.sessionRegistration.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, participant: true } },
        session: { include: { room: true } },
      },
      orderBy: { requestedAt: "asc" },
    });
    const groups = new Map<string, { session: { id: string; title: string; startsAt: Date; endsAt: Date; room: string | null; capacity: number | null }; requests: ReturnType<ProgrammeAdminService["attendeeView"]>[] }>();
    for (const row of rows) {
      const group = groups.get(row.sessionId) ?? {
        session: {
          id: row.session.id,
          title: row.session.title,
          startsAt: row.session.startsAt,
          endsAt: row.session.endsAt,
          room: row.session.room?.name ?? null,
          capacity: row.session.capacity,
        },
        requests: [],
      };
      group.requests.push(this.attendeeView(row));
      groups.set(row.sessionId, group);
    }
    return { total: rows.length, groups: [...groups.values()] };
  }

  async decide(dto: DecideRequestsDto, actorId: string) {
    const rows = await this.prisma.sessionRegistration.findMany({
      where: { id: { in: dto.registrationIds }, status: "PENDING" },
      include: { session: true, user: { include: { participant: true } } },
    });
    let approved = 0;
    let waitlisted = 0;
    let declined = 0;
    for (const row of rows) {
      let status = "DECLINED";
      if (dto.decision === "APPROVE") {
        const taken = await this.prisma.sessionRegistration.count({ where: { sessionId: row.sessionId, status: "REGISTERED" } });
        status = row.session.capacity != null && taken >= row.session.capacity ? "WAITLISTED" : "REGISTERED";
      }
      await this.prisma.sessionRegistration.update({
        where: { id: row.id },
        data: { status, decidedAt: new Date(), decidedById: actorId, note: dto.decision === "DECLINE" ? (dto.note ?? null) : null },
      });
      if (status === "REGISTERED") approved++;
      else if (status === "WAITLISTED") waitlisted++;
      else declined++;

      const title =
        status === "REGISTERED" ? "Demande acceptée" : status === "WAITLISTED" ? "Demande acceptée — liste d'attente" : "Demande non retenue";
      const body =
        status === "REGISTERED"
          ? `Votre participation à « ${row.session.title} » est confirmée.`
          : status === "WAITLISTED"
            ? `Votre demande pour « ${row.session.title} » est acceptée ; la session est complète, vous êtes sur liste d'attente.`
            : `Votre demande pour « ${row.session.title} » n'a pas été retenue.${dto.note ? ` ${dto.note}` : ""}`;
      await this.notify([row.userId], "SESSION_REQUEST_DECIDED", title, body);
      const name = row.user.participant?.firstName ?? row.user.name ?? "";
      const website = process.env.WEBSITE_ORIGIN ?? "http://localhost:4200";
      await this.mailer
        .compose({
          to: row.user.email,
          name,
          subject: `${title} — ${row.session.title}`,
          preheader: body,
          title,
          intro: body,
          details: [
            { label: "Session", value: row.session.title },
            { label: "Quand", value: this.when(row.session.startsAt) },
          ],
          actions: [{ label: "Voir mon programme", url: `${website}/mon-espace`, primary: true }],
          footerNote: "Vous recevez cet e-mail parce que vous avez demandé à participer à cette session.",
        })
        .catch(() => false);
    }
    return { approved, waitlisted, declined };
  }

  // --- Rooms -----------------------------------------------------------------

  rooms() {
    return this.prisma.room.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
  }

  async createRoom(dto: RoomInputDto) {
    const order = dto.order ?? (await this.prisma.room.count());
    return this.prisma.room.create({ data: { name: dto.name, capacity: dto.capacity ?? null, color: dto.color ?? "#006da4", order } });
  }

  async updateRoom(roomId: string, dto: RoomInputDto) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException("Salle introuvable.");
    return this.prisma.room.update({
      where: { id: roomId },
      data: { name: dto.name, capacity: dto.capacity ?? null, color: dto.color ?? room.color, order: dto.order ?? room.order },
    });
  }

  async removeRoom(roomId: string) {
    const used = await this.prisma.programSession.count({ where: { roomId } });
    if (used) throw new BadRequestException(`${used} session(s) utilisent cette salle : déplacez-les d'abord.`);
    await this.prisma.room.delete({ where: { id: roomId } });
    return { deleted: true };
  }

  // --- Internals -------------------------------------------------------------

  private async candidate(dto: SessionInputDto, id?: string) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (!(endsAt > startsAt)) throw new BadRequestException("La fin doit être après le début.");
    const day = kinshasaDay(startsAt);
    const festivalDays = await this.festival.days();
    if (!festivalDays.some((festivalDay) => festivalDay.date === day) || kinshasaDay(endsAt) !== day) {
      const label = this.festival.dateLabel(festivalDays);
      throw new BadRequestException(`La session doit se tenir sur un seul jour du festival (${label}).`);
    }
    const minutes = (date: Date) => Number(TIME.format(date).replace(":", "").padStart(4, "0"));
    if (minutes(startsAt) < Number(DAY_START.replace(":", "")) || minutes(endsAt) > Number(DAY_END.replace(":", ""))) {
      throw new BadRequestException(`Les sessions se tiennent entre ${DAY_START} et ${DAY_END}.`);
    }
    if (dto.roomId && !(await this.prisma.room.findUnique({ where: { id: dto.roomId } }))) {
      throw new BadRequestException("Salle introuvable.");
    }
    const speakerIds = [...new Set(dto.speakerIds ?? [])];
    if (speakerIds.length && (await this.prisma.speaker.count({ where: { id: { in: speakerIds } } })) !== speakerIds.length) {
      throw new BadRequestException("Un ou plusieurs intervenants sont introuvables.");
    }
    return { id, startsAt, endsAt, roomId: dto.roomId ?? null, speakerIds, capacity: dto.capacity ?? null };
  }

  private async conflictsFor(candidate: Awaited<ReturnType<ProgrammeAdminService["candidate"]>>): Promise<IConflict[]> {
    const sameDay = await this.prisma.programSession.findMany({
      where: {
        status: { not: "CANCELLED" },
        startsAt: { lt: candidate.endsAt },
        endsAt: { gt: candidate.startsAt },
      },
      include: adminInclude,
    });
    const speakers = await this.prisma.speaker.findMany({ where: { id: { in: candidate.speakerIds } }, select: { id: true, name: true } });
    const registered = candidate.id
      ? await this.prisma.sessionRegistration.count({ where: { sessionId: candidate.id, status: "REGISTERED" } })
      : 0;
    return findConflicts(
      candidate,
      sameDay.map((session) => this.toExisting(session)),
      new Map(speakers.map((speaker) => [speaker.id, speaker.name])),
      registered,
    );
  }

  private async assertNoBlocking(candidate: Awaited<ReturnType<ProgrammeAdminService["candidate"]>>, acknowledged?: boolean) {
    const conflicts = await this.conflictsFor(candidate);
    const blocking = conflicts.filter((conflict) => conflict.severity === "blocking");
    if (blocking.length && !acknowledged) {
      throw new ConflictException({ message: blocking.map((conflict) => conflict.message).join(" "), code: "CONFLICTS", conflicts });
    }
  }

  /** Lowering capacity: the most recent registrants beyond it move to the waitlist. */
  private async overflowToWaitlist(sessionId: string, capacity: number) {
    const registered = await this.prisma.sessionRegistration.findMany({
      where: { sessionId, status: "REGISTERED" },
      orderBy: { requestedAt: "asc" },
    });
    const overflow = registered.slice(capacity);
    if (!overflow.length) return;
    await this.prisma.sessionRegistration.updateMany({ where: { id: { in: overflow.map((row) => row.id) } }, data: { status: "WAITLISTED" } });
  }

  private sessionData(dto: SessionInputDto) {
    return {
      title: dto.title,
      description: dto.description ?? "",
      type: dto.type,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      roomId: dto.roomId ?? null,
      visibility: dto.visibility,
      admission: dto.admission,
      capacity: dto.capacity ?? null,
      waitlistEnabled: dto.waitlistEnabled ?? true,
    };
  }

  private diff(
    before: Prisma.ProgramSessionGetPayload<{ include: { room: true } }>,
    after: Prisma.ProgramSessionGetPayload<{ include: { room: true } }>,
  ) {
    const changedBefore: Record<string, unknown> = {};
    const changedAfter: Record<string, unknown> = {};
    for (const key of TRACKED) {
      const a = before[key] instanceof Date ? (before[key] as Date).toISOString() : before[key];
      const b = after[key] instanceof Date ? (after[key] as Date).toISOString() : after[key];
      if (a !== b) {
        if (key === "roomId") {
          changedBefore["room"] = before.room?.name ?? null;
          changedAfter["room"] = after.room?.name ?? null;
        } else {
          changedBefore[key] = a;
          changedAfter[key] = b;
        }
      }
    }
    return { before: changedBefore, after: changedAfter };
  }

  /** Logs a change and, when registrants are affected, tells them in their space right away. */
  private async recordChange(
    sessionId: string,
    actorId: string,
    kind: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    notify: boolean,
    acknowledgedConflicts = false,
  ) {
    const change = await this.prisma.sessionChange.create({
      data: {
        sessionId,
        actorId,
        kind,
        before: before as Prisma.InputJsonValue,
        after: { ...after, ...(acknowledgedConflicts ? { acknowledgedConflicts: true } : {}) } as Prisma.InputJsonValue,
      },
    });
    if (!notify) return;
    const session = await this.prisma.programSession.findUniqueOrThrow({ where: { id: sessionId } });
    const registrants = await this.prisma.sessionRegistration.findMany({
      where: { sessionId, status: { in: ACTIVE } },
      select: { userId: true },
    });
    const title = kind === "CANCELLED" ? "Session annulée" : "Programme modifié";
    const body =
      kind === "CANCELLED"
        ? `« ${session.title} » est annulée.`
        : `« ${session.title} » a été modifiée : ${this.describe(after)}.`;
    await this.notify(registrants.map((row) => row.userId), kind === "CANCELLED" ? "SESSION_CANCELLED" : "SESSION_CHANGED", title, body);
    await this.prisma.sessionChange.update({ where: { id: change.id }, data: { notifiedAt: new Date() } });
  }

  private describe(after: Record<string, unknown>) {
    const parts: string[] = [];
    if (typeof after["startsAt"] === "string") parts.push(`nouvel horaire ${this.when(new Date(after["startsAt"]))}`);
    if ("room" in after) parts.push(`salle ${after["room"] ?? "à confirmer"}`);
    if (after["status"] === "SCHEDULED") parts.push("de nouveau programmée");
    if (after["admission"]) parts.push(after["admission"] === "APPROVAL" ? "désormais sur validation" : "accès mis à jour");
    return parts.join(", ") || "informations mises à jour";
  }

  private when(date: Date) {
    return `${DAY.format(date)} à ${TIME.format(date).replace(":", "h")}`;
  }

  private async notify(userIds: string[], type: string, title: string, body: string) {
    if (!userIds.length) return;
    await this.prisma.userNotification.createMany({
      data: userIds.map((userId) => ({ userId, type, title, body, href: null })),
    });
  }

  private async emailRegistrants(
    sessionId: string,
    mail: { subject: string; preheader: string; title: string; intro: string[] },
  ) {
    const rows = await this.prisma.sessionRegistration.findMany({
      where: { sessionId, status: { in: ACTIVE } },
      include: { user: { include: { participant: true } } },
    });
    const website = process.env.WEBSITE_ORIGIN ?? "http://localhost:4200";
    for (const row of rows) {
      const sent = await this.mailer
        .compose({
          to: row.user.email,
          name: row.user.participant?.firstName ?? row.user.name,
          ...mail,
          actions: [{ label: "Voir mon programme", url: `${website}/mon-espace`, primary: true }],
          footerNote: "Vous recevez cet e-mail parce que vous étiez inscrit(e) à cette session.",
        })
        .catch(() => false);
      if (!sent) this.logger.warn(`E-mail « ${mail.subject} » non envoyé à ${row.user.email}.`);
    }
  }

  private async findSession(sessionId: string) {
    const session = await this.prisma.programSession.findUnique({ where: { id: sessionId }, include: { room: true } });
    if (!session) throw new NotFoundException("Session introuvable.");
    return session;
  }

  private async adminSession(sessionId: string) {
    const overview = await this.overview();
    const session = overview.sessions.find((row) => row.id === sessionId);
    if (!session) throw new NotFoundException("Session introuvable.");
    return session;
  }

  private toExisting(session: AdminSessionRow) {
    return {
      id: session.id,
      title: session.title,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      roomId: session.roomId,
      status: session.status,
      speakerIds: session.speakers.map(({ speakerId }) => speakerId),
      roomName: session.room?.name ?? null,
    };
  }

  private speakerNames(sessions: AdminSessionRow[]) {
    return new Map(sessions.flatMap((session) => session.speakers.map(({ speaker }) => [speaker.id, speaker.name] as const)));
  }

  private toAdminView(session: AdminSessionRow, counts: Record<string, number>, conflicts: IConflict[]) {
    return {
      id: session.id,
      code: session.code,
      title: session.title,
      description: session.description,
      type: session.type,
      day: kinshasaDay(session.startsAt),
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      roomId: session.roomId,
      room: session.room,
      visibility: session.visibility,
      admission: session.admission,
      capacity: session.capacity,
      waitlistEnabled: session.waitlistEnabled,
      status: session.status,
      cancelReason: session.cancelReason,
      version: session.version,
      speakers: session.speakers.map(({ speaker }) => ({
        id: speaker.id,
        name: speaker.name,
        title: speaker.title,
        photoUrl: speaker.photo ? `/uploads/speakers/${speaker.photo}` : null,
      })),
      counts: {
        registered: counts["REGISTERED"] ?? 0,
        pending: counts["PENDING"] ?? 0,
        waitlisted: counts["WAITLISTED"] ?? 0,
      },
      conflicts,
    };
  }

  private attendeeView(row: {
    id: string;
    status: string;
    note: string | null;
    requestedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      participant: { firstName: string; lastName: string; postnom: string; city: string; organization: string | null } | null;
    };
  }) {
    const participant = row.user.participant;
    return {
      registrationId: row.id,
      userId: row.user.id,
      name: participant ? fullName(participant.lastName, participant.postnom, participant.firstName) : row.user.name || row.user.email,
      email: row.user.email,
      role: row.user.role,
      city: participant?.city ?? null,
      organization: participant?.organization ?? null,
      status: row.status,
      note: row.note,
      requestedAt: row.requestedAt,
    };
  }
}
