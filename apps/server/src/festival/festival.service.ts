import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FestivalSettingsDto, IFestivalDayInput } from "./festival.dto";

export interface IFestivalDay {
  date: string;
  label: string;
  theme: string;
}

const DEFAULT_DAYS: IFestivalDay[] = [
  { date: "2026-11-25", label: "Jour 1", theme: "Inspirer • Découvrir • Connecter" },
  { date: "2026-11-26", label: "Jour 2", theme: "Apprendre • Construire • Expérimenter" },
  { date: "2026-11-27", label: "Jour 3", theme: "Pitcher • S'engager • Célébrer" },
];

const DAY_MS = 86_400_000;
const TZ = "Africa/Kinshasa";
const LONG_DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "UTC" });
const MONTH_YEAR = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const SHORT_MONTH_YEAR = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });
const FULL_DATE = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const noon = (date: string) => new Date(`${date}T12:00:00Z`);
/** 23:59 Kinshasa time, `daysBefore` days before a festival day. */
const deadlineBefore = (date: string, daysBefore: number) =>
  new Date(new Date(`${date}T23:59:00+01:00`).getTime() - daysBefore * DAY_MS);

/** Defaults so the public countdowns are complete from day one; admins adjust them afterwards. */
const DEFAULT_BADGE_DAYS_BEFORE = 5;
const DEFAULT_APPLICATIONS_DAYS_BEFORE = 31;

/**
 * Festival identity and dates, editable from the console (one row). Everything else — programme days,
 * public pages, e-mails, badge deadline, application window — reads from here instead of a constant.
 */
@Injectable()
export class FestivalService {
  private readonly logger = new Logger(FestivalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async settings() {
    const firstDay = DEFAULT_DAYS[0].date;
    return this.prisma.festivalSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        days: DEFAULT_DAYS as unknown as Prisma.InputJsonValue,
        badgeDeadline: deadlineBefore(firstDay, DEFAULT_BADGE_DAYS_BEFORE),
        applicationsCloseAt: deadlineBefore(firstDay, DEFAULT_APPLICATIONS_DAYS_BEFORE),
      },
      update: {},
    });
  }

  async days(): Promise<IFestivalDay[]> {
    return this.parseDays((await this.settings()).days);
  }

  /** Everything the public site, the console chrome and the e-mail footer need. */
  async publicView() {
    const settings = await this.settings();
    const days = this.parseDays(settings.days);
    return {
      name: settings.name,
      shortName: settings.shortName,
      city: settings.city,
      country: settings.country,
      location: [settings.city, settings.country].filter(Boolean).join(", "),
      days,
      dateLabel: this.dateLabel(days),
      shortDateLabel: this.dateLabel(days, true),
      startsAt: days.length ? new Date(`${days[0].date}T08:00:00+01:00`) : null,
      endsAt: days.length ? new Date(`${days[days.length - 1].date}T23:59:00+01:00`) : null,
      badgeDeadline: settings.badgeDeadline,
      applicationsOpenAt: settings.applicationsOpenAt,
      applicationsCloseAt: settings.applicationsCloseAt,
      applicationsOpen: this.applicationsOpen(settings),
      /** Public GA4 id (G-…), served here so ops can change it without rebuilding the site. */
      analyticsMeasurementId: process.env.GA_MEASUREMENT_ID?.trim() || null,
      updatedAt: settings.updatedAt,
    };
  }

  /** "2–4 décembre 2026", or "30 novembre – 2 décembre 2026" when the days straddle two months. */
  dateLabel(days: IFestivalDay[], short = false): string {
    if (!days.length) return "";
    const first = noon(days[0].date);
    const last = noon(days[days.length - 1].date);
    const monthYear = short ? SHORT_MONTH_YEAR : MONTH_YEAR;
    if (days.length === 1) return `${LONG_DAY.format(first)} ${monthYear.format(first)}`;
    if (first.getUTCMonth() === last.getUTCMonth() && first.getUTCFullYear() === last.getUTCFullYear()) {
      return `${LONG_DAY.format(first)}–${LONG_DAY.format(last)} ${monthYear.format(last)}`;
    }
    return `${LONG_DAY.format(first)} ${monthYear.format(first)} – ${LONG_DAY.format(last)} ${monthYear.format(last)}`;
  }

  /** "mercredi 2 décembre" for a festival day. */
  fullDayLabel(date: string): string {
    return FULL_DATE.format(noon(date));
  }

  async assertApplicationsOpen() {
    const settings = await this.settings();
    if (process.env.FORCE_APPLICATIONS_OPEN === "true") return;
    const now = Date.now();
    if (settings.applicationsOpenAt && now < settings.applicationsOpenAt.getTime()) {
      throw new BadRequestException("Les candidatures ne sont pas encore ouvertes.");
    }
    if (settings.applicationsCloseAt && now > settings.applicationsCloseAt.getTime()) {
      throw new BadRequestException("Les candidatures sont closes.");
    }
  }

  async badgeDeadlinePassed(): Promise<boolean> {
    const settings = await this.settings();
    return !!settings.badgeDeadline && settings.badgeDeadline.getTime() < Date.now();
  }

  /**
   * Saving new dates moves the whole festival with them: each day keeps its position, and every
   * session and speaker assignment shifts by the same number of days (stakeholder, 2026-10-06).
   */
  async update(dto: FestivalSettingsDto) {
    const current = await this.settings();
    const oldDays = this.parseDays(current.days);
    const newDays = dto.days ? this.validateDays(dto.days) : oldDays;
    const moves = this.dayMoves(oldDays, newDays);

    if (dto.days) {
      const removed = oldDays.slice(newDays.length).map((day) => day.date);
      if (removed.length) {
        const orphans = await this.sessionsOn(removed);
        if (orphans.length) {
          throw new BadRequestException(
            `Impossible de supprimer ce jour : ${orphans.length} session(s) y sont programmées (${orphans
              .slice(0, 3)
              .map((session) => session.title)
              .join(", ")}${orphans.length > 3 ? "…" : ""}).`,
          );
        }
      }
      for (const move of moves) {
        await this.shiftDay(move.from, move.shiftDays);
      }
    }

    const settings = await this.prisma.festivalSettings.update({
      where: { id: "default" },
      data: {
        name: dto.name,
        shortName: dto.shortName,
        city: dto.city,
        country: dto.country,
        days: dto.days ? (newDays as unknown as Prisma.InputJsonValue) : undefined,
        badgeDeadline: dto.badgeDeadline === undefined ? undefined : this.toDate(dto.badgeDeadline),
        applicationsOpenAt: dto.applicationsOpenAt === undefined ? undefined : this.toDate(dto.applicationsOpenAt),
        applicationsCloseAt: dto.applicationsCloseAt === undefined ? undefined : this.toDate(dto.applicationsCloseAt),
      },
    });
    const shifted = moves.filter((move) => move.shiftDays !== 0);
    if (shifted.length) {
      this.logger.log(`Dates du festival modifiées : ${shifted.map((m) => `${m.from} → ${m.to}`).join(", ")}.`);
    }
    return { ...(await this.publicView()), movedDays: shifted.length, settings };
  }

  /** What a date change would move, without saving — shown as a confirmation in the console. */
  async previewUpdate(days: IFestivalDayInput[]) {
    const oldDays = await this.days();
    const newDays = this.validateDays(days);
    const moves = this.dayMoves(oldDays, newDays).filter((move) => move.shiftDays !== 0);
    const counts = await Promise.all(
      moves.map(async (move) => ({
        from: move.from,
        to: move.to,
        sessions: (await this.sessionsOn([move.from])).length,
        speakers: await this.prisma.speaker.count({ where: { days: { has: move.from } } }),
      })),
    );
    const removed = oldDays.slice(newDays.length).map((day) => day.date);
    return { moves: counts, removed, removedSessions: removed.length ? (await this.sessionsOn(removed)).length : 0 };
  }

  // --- Internals ------------------------------------------------------------------

  private dayMoves(oldDays: IFestivalDay[], newDays: IFestivalDay[]) {
    return oldDays
      .map((day, index) => {
        const target = newDays[index];
        if (!target) return null;
        return {
          from: day.date,
          to: target.date,
          shiftDays: Math.round((noon(target.date).getTime() - noon(day.date).getTime()) / DAY_MS),
        };
      })
      .filter((move): move is { from: string; to: string; shiftDays: number } => !!move);
  }

  private async shiftDay(from: string, shiftDays: number) {
    if (!shiftDays) return;
    const interval = `${shiftDays} days`;
    // Timestamps move by whole days, so start and end times of each session are preserved.
    await this.prisma.$executeRaw`
      UPDATE program_session
      SET "startsAt" = "startsAt" + ${interval}::interval,
          "endsAt" = "endsAt" + ${interval}::interval
      WHERE ("startsAt" AT TIME ZONE 'Africa/Kinshasa')::date = ${from}::date`;
    const to = new Date(noon(from).getTime() + shiftDays * DAY_MS).toISOString().slice(0, 10);
    const speakers = await this.prisma.speaker.findMany({ where: { days: { has: from } }, select: { id: true, days: true } });
    for (const speaker of speakers) {
      await this.prisma.speaker.update({
        where: { id: speaker.id },
        data: { days: speaker.days.map((day) => (day === from ? to : day)) },
      });
    }
  }

  private async sessionsOn(dates: string[]) {
    if (!dates.length) return [];
    return this.prisma.$queryRaw<{ id: string; title: string }[]>`
      SELECT id, title FROM program_session
      WHERE ("startsAt" AT TIME ZONE 'Africa/Kinshasa')::date = ANY(${dates}::date[])`;
  }

  private validateDays(days: IFestivalDayInput[]): IFestivalDay[] {
    if (!days.length) throw new BadRequestException("Le festival doit compter au moins un jour.");
    const parsed = days.map((day, index) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || Number.isNaN(Date.parse(`${day.date}T12:00:00Z`))) {
        throw new BadRequestException(`Date invalide : ${day.date}`);
      }
      return {
        date: day.date,
        label: day.label?.trim() || `Jour ${index + 1}`,
        theme: day.theme?.trim() ?? "",
      };
    });
    const dates = parsed.map((day) => day.date);
    if (new Set(dates).size !== dates.length) throw new BadRequestException("Deux jours ne peuvent pas avoir la même date.");
    if ([...dates].sort().join() !== dates.join()) throw new BadRequestException("Les jours doivent être dans l'ordre chronologique.");
    return parsed;
  }

  private parseDays(value: Prisma.JsonValue): IFestivalDay[] {
    if (!Array.isArray(value)) return DEFAULT_DAYS;
    const days = value.filter((item): item is { date: string; label?: string; theme?: string } => {
      return !!item && typeof item === "object" && typeof (item as { date?: unknown }).date === "string";
    });
    return days.length
      ? days.map((day, index) => ({ date: day.date, label: day.label ?? `Jour ${index + 1}`, theme: day.theme ?? "" }))
      : DEFAULT_DAYS;
  }

  private applicationsOpen(settings: { applicationsOpenAt: Date | null; applicationsCloseAt: Date | null }) {
    if (process.env.FORCE_APPLICATIONS_OPEN === "true") return true;
    const now = Date.now();
    if (settings.applicationsOpenAt && now < settings.applicationsOpenAt.getTime()) return false;
    return !settings.applicationsCloseAt || now <= settings.applicationsCloseAt.getTime();
  }

  private toDate(value: string | null) {
    return value ? new Date(value) : null;
  }
}

export { DEFAULT_DAYS };
