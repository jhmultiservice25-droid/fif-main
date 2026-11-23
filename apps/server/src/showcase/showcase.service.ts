import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { MailerService } from "../mailer/mailer.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProgrammeService } from "../programme/programme.service";
import { IParsedRow, parseSolutionsFile } from "./solutions-file";

/** Tag on Demo Show registrations created by a pick, so releasing only undoes what the picker did. */
const AUTO_NOTE = "auto:showcase";
const IMPORT_TTL_MS = 15 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type Tx = Prisma.TransactionClient;

interface IImportPreview {
  create: IParsedRow[];
  update: (IParsedRow & { id: string })[];
  deactivate: { id: string; reference: string; name: string; presenters: number }[];
  errors: { line: number; message: string }[];
  expiresAt: number;
}

@Injectable()
export class ShowcaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ShowcaseService.name);
  private readonly previews = new Map<string, IImportPreview>();
  private reminderTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly programme: ProgrammeService,
    private readonly mailer: MailerService,
  ) {}

  onModuleInit() {
    this.reminderTimer = setInterval(() => void this.sendDeadlineReminders().catch(() => undefined), HOUR_MS);
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }

  // --- Settings ----------------------------------------------------------------

  async settings() {
    return this.prisma.showcaseSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
  }

  async updateSettings(input: {
    pickerOpen?: boolean;
    deadline?: string | null;
    maxPerInnovator?: number;
    maxPerSolution?: number;
    demoShowSessionIds?: string[];
  }) {
    await this.settings();
    if (input.demoShowSessionIds?.length) {
      const found = await this.prisma.programSession.count({ where: { id: { in: input.demoShowSessionIds } } });
      if (found !== input.demoShowSessionIds.length) throw new BadRequestException("Session Demo Show introuvable.");
    }
    return this.prisma.showcaseSettings.update({
      where: { id: "default" },
      data: {
        pickerOpen: input.pickerOpen,
        deadline: input.deadline === undefined ? undefined : input.deadline ? new Date(input.deadline) : null,
        maxPerInnovator: input.maxPerInnovator,
        maxPerSolution: input.maxPerSolution,
        demoShowSessionIds: input.demoShowSessionIds,
        // A new deadline deserves a new reminder.
        ...(input.deadline !== undefined ? { reminderSentAt: null } : {}),
      },
    });
  }

  // --- Innovator picker --------------------------------------------------------

  async innovatorView(userId: string, query: { search?: string; sector?: string }) {
    const settings = await this.settings();
    const where: Prisma.ShowcaseSolutionWhereInput = {
      active: true,
      ...(query.sector ? { sector: query.sector } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { summary: { contains: query.search, mode: "insensitive" } },
              { reference: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [solutions, mine, sectors] = await Promise.all([
      this.prisma.showcaseSolution.findMany({
        where,
        orderBy: { name: "asc" },
        include: { _count: { select: { presenters: true } } },
      }),
      this.prisma.solutionPresenter.findMany({ where: { userId }, include: { solution: true }, orderBy: { createdAt: "asc" } }),
      this.sectors(),
    ]);
    const mineIds = new Set(mine.map((row) => row.solutionId));
    return {
      settings: this.publicSettings(settings),
      picks: mine.map((row) => ({
        solutionId: row.solutionId,
        reference: row.solution.reference,
        name: row.solution.name,
        listedPublicly: row.listedPublicly,
        pickedAt: row.createdAt,
      })),
      sectors,
      solutions: solutions.map((solution) => ({
        id: solution.id,
        reference: solution.reference,
        name: solution.name,
        summary: solution.summary,
        sector: solution.sector,
        city: solution.city,
        teamName: solution.teamName,
        presenters: solution._count.presenters,
        placesLeft: Math.max(0, settings.maxPerSolution - solution._count.presenters),
        mine: mineIds.has(solution.id),
      })),
    };
  }

  /** First confirmed request wins the last place; limits are enforced under row locks (ADR-006). */
  async pick(userId: string, solutionId: string, listedPublicly = true) {
    const settings = await this.settings();
    this.assertPickerOpen(settings);
    await this.prisma.$transaction(async (tx) => {
      await this.lockUser(tx, userId);
      const solution = await this.lockSolution(tx, solutionId);
      if (!solution.active) throw new BadRequestException("Cette solution n'est plus disponible.");
      if (await tx.solutionPresenter.findUnique({ where: { solutionId_userId: { solutionId, userId } } })) return;
      const taken = await tx.solutionPresenter.count({ where: { solutionId } });
      if (taken >= settings.maxPerSolution) {
        throw new ConflictException({ message: "Plus de place sur cette solution : choisissez-en une autre.", code: "SOLUTION_FULL" });
      }
      const held = await tx.solutionPresenter.count({ where: { userId } });
      if (held >= settings.maxPerInnovator) {
        throw new ConflictException({
          message: `Vous présentez déjà ${settings.maxPerInnovator} solutions. Libérez-en une pour en choisir une autre.`,
          code: "INNOVATOR_LIMIT",
        });
      }
      await tx.solutionPresenter.create({ data: { solutionId, userId, listedPublicly } });
    });
    await this.syncDemoShow(userId, settings.demoShowSessionIds);
    await this.notify(userId, "Présentation confirmée", `Vous présenterez une solution au FIF 2026.`);
    return this.innovatorView(userId, {});
  }

  async release(userId: string, solutionId: string) {
    const settings = await this.settings();
    this.assertPickerOpen(settings);
    const row = await this.prisma.solutionPresenter.findUnique({ where: { solutionId_userId: { solutionId, userId } } });
    if (!row) throw new NotFoundException("Vous ne présentez pas cette solution.");
    await this.prisma.solutionPresenter.delete({ where: { id: row.id } });
    await this.syncDemoShow(userId, settings.demoShowSessionIds);
    return this.innovatorView(userId, {});
  }

  async setListing(userId: string, solutionId: string, listedPublicly: boolean) {
    const row = await this.prisma.solutionPresenter.findUnique({ where: { solutionId_userId: { solutionId, userId } } });
    if (!row) throw new NotFoundException("Vous ne présentez pas cette solution.");
    await this.prisma.solutionPresenter.update({ where: { id: row.id }, data: { listedPublicly } });
    return this.innovatorView(userId, {});
  }

  // --- Admin -------------------------------------------------------------------

  async adminOverview() {
    const [settings, solutions, sectors] = await Promise.all([
      this.settings(),
      this.prisma.showcaseSolution.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
        include: { presenters: { include: { user: { select: { id: true, name: true, email: true } } } } },
      }),
      this.sectors(),
    ]);
    const active = solutions.filter((solution) => solution.active);
    return {
      settings,
      sectors,
      coverage: {
        active: active.length,
        covered: active.filter((solution) => solution.presenters.length > 0).length,
        full: active.filter((solution) => solution.presenters.length >= settings.maxPerSolution).length,
        presenters: new Set(active.flatMap((solution) => solution.presenters.map((row) => row.userId))).size,
      },
      solutions: solutions.map((solution) => ({
        id: solution.id,
        reference: solution.reference,
        name: solution.name,
        summary: solution.summary,
        sector: solution.sector,
        city: solution.city,
        teamName: solution.teamName,
        contactEmail: solution.contactEmail,
        website: solution.website,
        active: solution.active,
        presenters: solution.presenters.map((row) => ({
          userId: row.userId,
          name: row.user.name || row.user.email,
          email: row.user.email,
          listedPublicly: row.listedPublicly,
          assignedByAdmin: !!row.assignedById,
          pickedAt: row.createdAt,
        })),
      })),
    };
  }

  async adminAdd(solutionId: string, email: string, overrideLimits: boolean, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || user.role !== "INNOVATOR") {
      throw new NotFoundException("Aucun innovateur avec cette adresse.");
    }
    const settings = await this.settings();
    const solution = await this.prisma.$transaction(async (tx) => {
      await this.lockUser(tx, user.id);
      const target = await this.lockSolution(tx, solutionId);
      if (await tx.solutionPresenter.findUnique({ where: { solutionId_userId: { solutionId, userId: user.id } } })) return target;
      if (!overrideLimits) {
        await this.assertLimits(tx, settings, solutionId, user.id);
      }
      await tx.solutionPresenter.create({ data: { solutionId, userId: user.id, assignedById: actorId } });
      return target;
    });
    await this.syncDemoShow(user.id, settings.demoShowSessionIds);
    await this.informInnovator(
      user.id,
      "Présentation attribuée",
      `L'équipe FIF vous a attribué la présentation de « ${solution.name} » au FIF 2026.`,
    );
    return this.adminOverview();
  }

  async adminRemove(solutionId: string, userId: string) {
    const settings = await this.settings();
    const row = await this.prisma.solutionPresenter.findUnique({
      where: { solutionId_userId: { solutionId, userId } },
      include: { solution: true },
    });
    if (!row) throw new NotFoundException("Présentateur introuvable.");
    await this.prisma.solutionPresenter.delete({ where: { id: row.id } });
    await this.syncDemoShow(userId, settings.demoShowSessionIds);
    await this.informInnovator(
      userId,
      "Présentation retirée",
      `L'équipe FIF a retiré votre présentation de « ${row.solution.name} ». Vous pouvez choisir une autre solution depuis votre espace.`,
    );
    return this.adminOverview();
  }

  async adminMove(solutionId: string, userId: string, toSolutionId: string, overrideLimits: boolean, actorId: string) {
    if (solutionId === toSolutionId) return this.adminOverview();
    const settings = await this.settings();
    const { from, to } = await this.prisma.$transaction(async (tx) => {
      await this.lockUser(tx, userId);
      const [first, second] = [solutionId, toSolutionId].sort();
      const a = await this.lockSolution(tx, first);
      const b = await this.lockSolution(tx, second);
      const fromSolution = a.id === solutionId ? a : b;
      const toSolution = a.id === toSolutionId ? a : b;
      const row = await tx.solutionPresenter.findUnique({ where: { solutionId_userId: { solutionId, userId } } });
      if (!row) throw new NotFoundException("Présentateur introuvable.");
      if (await tx.solutionPresenter.findUnique({ where: { solutionId_userId: { solutionId: toSolutionId, userId } } })) {
        throw new BadRequestException("Cet innovateur présente déjà la solution de destination.");
      }
      if (!overrideLimits) {
        const taken = await tx.solutionPresenter.count({ where: { solutionId: toSolutionId } });
        if (taken >= settings.maxPerSolution) {
          throw new ConflictException({ message: "La solution de destination est complète.", code: "SOLUTION_FULL" });
        }
      }
      await tx.solutionPresenter.update({ where: { id: row.id }, data: { solutionId: toSolutionId, assignedById: actorId } });
      return { from: fromSolution, to: toSolution };
    });
    await this.informInnovator(
      userId,
      "Présentation modifiée",
      `L'équipe FIF a remplacé « ${from.name} » par « ${to.name} » dans vos présentations.`,
    );
    return this.adminOverview();
  }

  async exportCsv() {
    const overview = await this.adminOverview();
    const escape = (value: string | null | undefined) => `"${(value ?? "").replace(/"/g, '""')}"`;
    const lines = [["Référence", "Solution", "Secteur", "Présentateur", "E-mail", "Choisi le"].map(escape).join(",")];
    for (const solution of overview.solutions.filter((row) => row.active)) {
      const presenters = solution.presenters.length ? solution.presenters : [null];
      for (const presenter of presenters) {
        lines.push(
          [
            solution.reference,
            solution.name,
            solution.sector,
            presenter?.name ?? "",
            presenter?.email ?? "",
            presenter ? presenter.pickedAt.toISOString() : "",
          ]
            .map(escape)
            .join(","),
        );
      }
    }
    return `﻿${lines.join("\n")}`;
  }

  // --- Import --------------------------------------------------------------------

  /** Dry run: nothing is written until the returned token is confirmed (ADR-006). */
  async previewImport(file: { buffer: Buffer; originalname: string }) {
    const { rows, errors } = await parseSolutionsFile(file.buffer, file.originalname);
    const existing = await this.prisma.showcaseSolution.findMany({ include: { _count: { select: { presenters: true } } } });
    const byReference = new Map(existing.map((solution) => [solution.reference, solution]));
    const seen = new Set(rows.map((row) => row.reference));
    const preview: IImportPreview = {
      create: rows.filter((row) => !byReference.has(row.reference)),
      update: rows.filter((row) => byReference.has(row.reference)).map((row) => ({ ...row, id: byReference.get(row.reference)!.id })),
      deactivate: existing
        .filter((solution) => solution.active && !seen.has(solution.reference))
        .map((solution) => ({ id: solution.id, reference: solution.reference, name: solution.name, presenters: solution._count.presenters })),
      errors,
      expiresAt: Date.now() + IMPORT_TTL_MS,
    };
    const token = randomUUID();
    this.previews.set(token, preview);
    for (const [key, value] of this.previews) if (value.expiresAt < Date.now()) this.previews.delete(key);
    return {
      token,
      create: preview.create.length,
      update: preview.update.length,
      deactivate: preview.deactivate,
      errors,
      sample: [...preview.create, ...preview.update].slice(0, 5),
    };
  }

  async confirmImport(token: string, deactivateMissing: boolean) {
    const preview = this.previews.get(token);
    if (!preview || preview.expiresAt < Date.now()) {
      throw new BadRequestException("Aperçu expiré : importez le fichier à nouveau.");
    }
    this.previews.delete(token);
    const fields = (row: IParsedRow) => ({
      name: row.name,
      summary: row.summary,
      sector: row.sector,
      city: row.city,
      teamName: row.teamName,
      contactEmail: row.contactEmail,
      website: row.website,
      active: true,
    });
    await this.prisma.$transaction([
      ...preview.create.map((row) => this.prisma.showcaseSolution.create({ data: { reference: row.reference, ...fields(row) } })),
      ...preview.update.map((row) => this.prisma.showcaseSolution.update({ where: { id: row.id }, data: fields(row) })),
    ]);
    let deactivated = 0;
    if (deactivateMissing && preview.deactivate.length) {
      for (const solution of preview.deactivate) {
        const presenters = await this.prisma.solutionPresenter.findMany({ where: { solutionId: solution.id } });
        await this.prisma.showcaseSolution.update({ where: { id: solution.id }, data: { active: false } });
        await this.prisma.solutionPresenter.deleteMany({ where: { solutionId: solution.id } });
        const settings = await this.settings();
        for (const presenter of presenters) {
          await this.syncDemoShow(presenter.userId, settings.demoShowSessionIds);
          await this.informInnovator(
            presenter.userId,
            "Solution retirée du catalogue",
            `« ${solution.name} » a été retirée de la sélection FIF 2026. Choisissez une autre solution à présenter depuis votre espace.`,
          );
        }
        deactivated++;
      }
    }
    return { created: preview.create.length, updated: preview.update.length, deactivated };
  }

  // --- Internals -----------------------------------------------------------------

  private publicSettings(settings: Awaited<ReturnType<ShowcaseService["settings"]>>) {
    return {
      pickerOpen: settings.pickerOpen,
      deadline: settings.deadline,
      closed: !this.isOpen(settings),
      maxPerInnovator: settings.maxPerInnovator,
      maxPerSolution: settings.maxPerSolution,
    };
  }

  private isOpen(settings: { pickerOpen: boolean; deadline: Date | null }) {
    return settings.pickerOpen && (!settings.deadline || settings.deadline > new Date());
  }

  private assertPickerOpen(settings: { pickerOpen: boolean; deadline: Date | null }) {
    if (!this.isOpen(settings)) {
      throw new BadRequestException("Les choix de présentation sont clôturés.");
    }
  }

  private async assertLimits(
    tx: Tx,
    settings: { maxPerSolution: number; maxPerInnovator: number },
    solutionId: string,
    userId: string,
  ) {
    const taken = await tx.solutionPresenter.count({ where: { solutionId } });
    if (taken >= settings.maxPerSolution) {
      throw new ConflictException({ message: "Cette solution est complète.", code: "SOLUTION_FULL" });
    }
    const held = await tx.solutionPresenter.count({ where: { userId } });
    if (held >= settings.maxPerInnovator) {
      throw new ConflictException({ message: "Cet innovateur a déjà atteint sa limite de présentations.", code: "INNOVATOR_LIMIT" });
    }
  }

  private async lockUser(tx: Tx, userId: string) {
    await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`;
  }

  private async lockSolution(tx: Tx, solutionId: string) {
    await tx.$queryRaw`SELECT id FROM showcase_solution WHERE id = ${solutionId} FOR UPDATE`;
    const solution = await tx.showcaseSolution.findUnique({ where: { id: solutionId } });
    if (!solution) throw new NotFoundException("Solution introuvable.");
    return solution;
  }

  /** Presenters are registered to the Demo Show sessions; that registration goes away with their last pick. */
  private async syncDemoShow(userId: string, sessionIds: string[]) {
    if (!sessionIds.length) return;
    const holds = await this.prisma.solutionPresenter.count({ where: { userId } });
    for (const sessionId of sessionIds) {
      if (holds > 0) {
        await this.programme.join(userId, sessionId, { invited: true, note: AUTO_NOTE }).catch((error: Error) => {
          this.logger.warn(`Inscription Demo Show impossible (${sessionId}) : ${error.message}`);
        });
      } else {
        await this.prisma.sessionRegistration.updateMany({
          where: { userId, sessionId, note: AUTO_NOTE, status: { not: "CANCELLED" } },
          data: { status: "CANCELLED" },
        });
      }
    }
  }

  private async sectors() {
    const rows = await this.prisma.showcaseSolution.findMany({
      where: { active: true, sector: { not: "" } },
      distinct: ["sector"],
      select: { sector: true },
      orderBy: { sector: "asc" },
    });
    return rows.map((row) => row.sector);
  }

  private async notify(userId: string, title: string, body: string) {
    await this.prisma.userNotification.create({ data: { userId, type: "SHOWCASE", title, body, href: "/innovateur/presentations" } });
  }

  /** Admin-driven changes are both in-app and e-mailed to the affected innovator (PRD-003 §8). */
  private async informInnovator(userId: string, title: string, body: string) {
    await this.notify(userId, title, body);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const website = process.env.WEBSITE_ORIGIN ?? "http://localhost:4200";
    await this.mailer
      .compose({
        to: user.email,
        name: user.name,
        subject: title,
        preheader: body,
        title,
        intro: body,
        actions: [{ label: "Mes présentations", url: `${website}/innovateur/presentations`, primary: true }],
        footerNote: "Vous recevez cet e-mail en tant qu'innovateur inscrit au festival.",
      })
      .catch(() => false);
  }

  /** Once, 48 h before the deadline: innovators who hold fewer picks than allowed. */
  async sendDeadlineReminders() {
    const settings = await this.settings();
    if (!settings.deadline || settings.reminderSentAt || !this.isOpen(settings)) return;
    if (settings.deadline.getTime() - Date.now() > 48 * HOUR_MS) return;
    await this.prisma.showcaseSettings.update({ where: { id: "default" }, data: { reminderSentAt: new Date() } });
    const innovators = await this.prisma.user.findMany({
      where: { role: "INNOVATOR" },
      include: { _count: { select: { presentations: true } } },
    });
    for (const innovator of innovators.filter((row) => row._count.presentations < settings.maxPerInnovator)) {
      await this.informInnovator(
        innovator.id,
        "Dernier rappel : vos présentations",
        `Il vous reste moins de 48 h pour choisir les solutions que vous présenterez au FIF 2026 (${innovator._count.presentations}/${settings.maxPerInnovator} choisies).`,
      );
    }
  }
}
