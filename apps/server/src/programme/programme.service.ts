import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FestivalService } from "../festival/festival.service";
import { DEFAULT_ROOMS, DEFAULT_SESSIONS, FESTIVAL_DAYS, kinshasaDay, kinshasaTime } from "./programme.seed";

/** Statuses that hold (or wait for) a seat; anything else is history. */
const SEED_DAYS: string[] = FESTIVAL_DAYS.map((day) => day.date);

const ACTIVE_STATUSES = ["REGISTERED", "PENDING", "WAITLISTED"];

const sessionInclude = {
  room: { select: { id: true, name: true, color: true } },
  speakers: { include: { speaker: { select: { id: true, name: true, title: true, photo: true } } } },
} satisfies Prisma.ProgramSessionInclude;

type SessionRow = Prisma.ProgramSessionGetPayload<{ include: typeof sessionInclude }>;
type Tx = Prisma.TransactionClient;

export interface IJoinResult {
  sessionId: string;
  title: string;
  status: string;
}

@Injectable()
export class ProgrammeService implements OnModuleInit {
  private readonly logger = new Logger(ProgrammeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly festival: FestivalService,
  ) {}

  /** Inserts the default programme when none exists; never touches sessions admins already edited. */
  async onModuleInit() {
    try {
      await this.seedDefaults();
    } catch (error) {
      // A missing migration must not take the whole API down; the programme endpoints will report it.
      this.logger.error(`Programme par défaut non créé : ${(error as Error).message}`);
    }
  }

  private async seedDefaults() {
    if ((await this.prisma.programSession.count()) > 0) return;
    // The seed's own dates are only a starting point: place the days where the festival is actually set.
    const festivalDays = await this.festival.days();
    const dayFor = (seedDay: string) => {
      const index = SEED_DAYS.indexOf(seedDay);
      return festivalDays[index]?.date ?? seedDay;
    };
    const rooms = new Map<string, string>();
    for (const room of DEFAULT_ROOMS) {
      const row = await this.prisma.room.create({ data: { name: room.name, color: room.color, order: room.order } });
      rooms.set(room.key, row.id);
    }
    await this.prisma.programSession.createMany({
      data: DEFAULT_SESSIONS.map((session) => ({
        code: session.code,
        title: session.title,
        description: session.description,
        type: session.type,
        admission: session.admission,
        startsAt: kinshasaTime(dayFor(session.day), session.start),
        endsAt: kinshasaTime(dayFor(session.day), session.end),
        roomId: session.room ? rooms.get(session.room) : null,
      })),
      skipDuplicates: true,
    });
    this.logger.log(`Programme par défaut créé (${DEFAULT_SESSIONS.length} sessions).`);
  }

  /** Public programme grouped by festival day; invite-only sessions never appear. */
  async publicProgramme() {
    const sessions = await this.prisma.programSession.findMany({
      where: { visibility: "PUBLIC" },
      include: sessionInclude,
      orderBy: [{ startsAt: "asc" }, { title: "asc" }],
    });
    const registered = await this.registeredCounts(sessions.map((session) => session.id));
    const festivalDays = await this.festival.days();
    return {
      days: festivalDays.map((day) => ({
        ...day,
        sessions: sessions
          .filter((session) => kinshasaDay(session.startsAt) === day.date)
          .map((session) => this.toView(session, registered.get(session.id) ?? 0)),
      })),
    };
  }

  /** The signed-in attendee's sessions, with unseen programme changes. */
  async myProgramme(userId: string) {
    const registrations = await this.prisma.sessionRegistration.findMany({
      where: { userId, status: { not: "CANCELLED" } },
      include: {
        session: { include: { ...sessionInclude, changes: { orderBy: { createdAt: "desc" }, take: 5 } } },
      },
      orderBy: { session: { startsAt: "asc" } },
    });
    const registered = await this.registeredCounts(registrations.map((row) => row.sessionId));
    return {
      days: await this.festival.days(),
      items: registrations.map((row) => ({
        session: this.toView(row.session, registered.get(row.sessionId) ?? 0),
        status: row.status,
        note: row.note,
        requestedAt: row.requestedAt,
        changes: row.session.changes
          .filter((change) => change.createdAt > row.seenAt)
          .map((change) => ({ kind: change.kind, before: change.before, after: change.after, at: change.createdAt })),
      })),
    };
  }

  async markSeen(userId: string) {
    await this.prisma.sessionRegistration.updateMany({ where: { userId }, data: { seenAt: new Date() } });
    return this.myProgramme(userId);
  }

  /** Public, registrable, scheduled sessions among the given ids (unknown ids are rejected). */
  async assertRegistrable(sessionIds: string[]) {
    const unique = [...new Set(sessionIds)];
    const sessions = await this.prisma.programSession.findMany({ where: { id: { in: unique } } });
    if (sessions.length !== unique.length) {
      throw new BadRequestException("Une ou plusieurs sessions sont introuvables.");
    }
    const invalid = sessions.find(
      (session) => session.visibility !== "PUBLIC" || session.admission === "NONE" || session.status !== "SCHEDULED",
    );
    if (invalid) {
      throw new BadRequestException(`« ${invalid.title} » n'accepte pas d'inscription.`);
    }
    return unique;
  }

  async joinMany(userId: string, sessionIds: string[]): Promise<IJoinResult[]> {
    const ids = await this.assertRegistrable(sessionIds);
    const results: IJoinResult[] = [];
    for (const sessionId of ids) {
      results.push(await this.join(userId, sessionId));
    }
    return results;
  }

  /**
   * Registers all selected sessions within a transaction owned by the caller.
   * The caller must validate the session IDs with assertRegistrable before invoking.
   * Sorting locks prevents deadlocks when users choose activities in different orders.
   */
  async joinManyInTransaction(tx: Tx, userId: string, sessionIds: string[]): Promise<IJoinResult[]> {
    const ids = [...new Set(sessionIds)];
    const results = new Map<string, IJoinResult>();
    for (const sessionId of [...ids].sort()) {
      results.set(sessionId, await this.joinInTransaction(tx, userId, sessionId));
    }
    return ids.map((id) => results.get(id)!);
  }

  /**
   * Registers, requests or wait-lists one attendee. The session row is locked so concurrent
   * sign-ups cannot oversell a session with a capacity.
   */
  async join(userId: string, sessionId: string, options: { invited?: boolean; note?: string } = {}): Promise<IJoinResult> {
    return this.prisma.$transaction((tx) => this.joinInTransaction(tx, userId, sessionId, options));
  }

  private async joinInTransaction(
    tx: Tx,
    userId: string,
    sessionId: string,
    options: { invited?: boolean; note?: string } = {},
  ): Promise<IJoinResult> {
    const session = await this.lockSession(tx, sessionId);
    if (session.status !== "SCHEDULED") {
      throw new BadRequestException(`« ${session.title} » a été annulée.`);
    }
    if (!options.invited && (session.visibility !== "PUBLIC" || session.admission === "NONE")) {
      throw new BadRequestException(`« ${session.title} » n'accepte pas d'inscription.`);
    }

    const existing = await tx.sessionRegistration.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (existing && ACTIVE_STATUSES.includes(existing.status)) {
      return { sessionId, title: session.title, status: existing.status };
    }

    let status = "REGISTERED";
    if (session.admission === "APPROVAL" && !options.invited) {
      status = "PENDING";
    } else if (session.capacity != null) {
      const taken = await tx.sessionRegistration.count({ where: { sessionId, status: "REGISTERED" } });
      if (taken >= session.capacity) {
        if (!session.waitlistEnabled) {
          throw new BadRequestException(`« ${session.title} » est complète.`);
        }
        status = "WAITLISTED";
      }
    }

    const data = {
      status,
      note: options.note ?? null,
      requestedAt: new Date(),
      decidedAt: null,
      decidedById: null,
      seenAt: new Date(),
    };
    await tx.sessionRegistration.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: { sessionId, userId, ...data },
      update: data,
    });
    return { sessionId, title: session.title, status };
  }

  /** Cancels one registration or request and hands a freed seat to the first wait-listed attendee. */
  async cancel(userId: string, sessionId: string) {
    await this.prisma.$transaction(async (tx) => {
      const session = await this.lockSession(tx, sessionId);
      const existing = await tx.sessionRegistration.findUnique({
        where: { sessionId_userId: { sessionId, userId } },
      });
      if (!existing || !ACTIVE_STATUSES.includes(existing.status)) {
        throw new NotFoundException("Vous n'êtes pas inscrit(e) à cette session.");
      }
      await tx.sessionRegistration.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
      if (existing.status === "REGISTERED") {
        await this.promoteWaitlist(tx, session.id, session.title);
      }
    });
    return this.myProgramme(userId);
  }

  private async promoteWaitlist(tx: Tx, sessionId: string, title: string) {
    const next = await tx.sessionRegistration.findFirst({
      where: { sessionId, status: "WAITLISTED" },
      orderBy: { requestedAt: "asc" },
    });
    if (!next) return;
    await tx.sessionRegistration.update({ where: { id: next.id }, data: { status: "REGISTERED", decidedAt: new Date() } });
    await tx.userNotification.create({
      data: {
        userId: next.userId,
        type: "SESSION_WAITLIST_PROMOTED",
        title: "Une place s'est libérée",
        body: `Vous êtes maintenant inscrit(e) à « ${title} ».`,
        href: null,
      },
    });
  }

  private async lockSession(tx: Tx, sessionId: string) {
    await tx.$queryRaw`SELECT id FROM program_session WHERE id = ${sessionId} FOR UPDATE`;
    const session = await tx.programSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException("Session introuvable.");
    }
    return session;
  }

  private async registeredCounts(sessionIds: string[]) {
    if (!sessionIds.length) return new Map<string, number>();
    const rows = await this.prisma.sessionRegistration.groupBy({
      by: ["sessionId"],
      where: { sessionId: { in: sessionIds }, status: "REGISTERED" },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.sessionId, row._count._all]));
  }

  private toView(session: SessionRow, registered: number) {
    return {
      id: session.id,
      code: session.code,
      title: session.title,
      description: session.description,
      type: session.type,
      day: kinshasaDay(session.startsAt),
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      room: session.room,
      admission: session.admission,
      status: session.status,
      cancelReason: session.cancelReason,
      capacity: session.capacity,
      seatsLeft: session.capacity == null ? null : Math.max(0, session.capacity - registered),
      speakers: session.speakers.map(({ speaker }) => ({
        id: speaker.id,
        name: speaker.name,
        title: speaker.title,
        photoUrl: speaker.photo ? `/uploads/speakers/${speaker.photo}` : null,
      })),
    };
  }
}
