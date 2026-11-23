import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Media } from '@/app/core/media';
import { Toast } from '@/app/core/toast';
import { festivalDayLabel, SESSION_TYPE_LABELS, sessionRange } from '@/app/shared/helpers';
import { ProgrammeAdminApi, ProgrammeApiError } from '../data-access/programme-admin.api';
import { IAdminSession, IConflict, IProgrammeOverview, ISessionInput } from '../interfaces/programme-admin.interface';
import { IGridCreate, IGridMove, ScheduleGrid } from '../ui/schedule-grid';
import { IEditorDraft, SessionEditor } from '../ui/session-editor';
import { kinshasaIso, typeStyle } from '../ui/session-style';

type IFilter = 'all' | 'pending' | 'conflicts';

interface IPendingMove {
  move: IGridMove;
  conflicts: IConflict[];
}

/** Programme calendar of the console (PRD-002 §5.1): day × room grid on desktop, agenda list on phones. */
@Component({
  imports: [MatButtonModule, MatIconModule, RouterLink, ScheduleGrid, SessionEditor],
  templateUrl: './programme-calendar.html'
})
export default class ProgrammeCalendar implements OnInit {
  private readonly api = inject(ProgrammeAdminApi);
  private readonly toast = inject(Toast);
  private readonly media = inject(Media);

  protected readonly overview = signal<IProgrammeOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly dayIndex = signal(0);
  protected readonly filter = signal<IFilter>('all');
  protected readonly search = signal('');
  protected readonly isDesktop = computed(() => this.media.match('(min-width: 1024px)')());
  protected readonly view = signal<'grid' | 'list' | null>(null);
  protected readonly effectiveView = computed(() => this.view() ?? (this.isDesktop() ? 'grid' : 'list'));
  protected readonly editing = signal<IAdminSession | null>(null);
  protected readonly draft = signal<IEditorDraft | null>(null);
  protected readonly pendingMove = signal<IPendingMove | null>(null);

  protected readonly days = computed(() => this.overview()?.days ?? []);
  protected readonly rooms = computed(() => this.overview()?.rooms ?? []);
  protected readonly activeDay = computed(() => this.days()[this.dayIndex()] ?? null);
  protected readonly daySessions = computed(() => {
    const day = this.activeDay()?.date;
    const term = this.search().trim().toLowerCase();
    return (this.overview()?.sessions ?? []).filter((session) => {
      if (session.day !== day) return false;
      if (term && !`${session.title} ${session.speakers.map((s) => s.name).join(' ')}`.toLowerCase().includes(term)) return false;
      if (this.filter() === 'pending') return session.counts.pending > 0;
      if (this.filter() === 'conflicts') return session.conflicts.some((conflict) => conflict.severity === 'blocking');
      return true;
    });
  });
  protected readonly dayStats = computed(() =>
    this.days().map((day) => {
      const sessions = (this.overview()?.sessions ?? []).filter((session) => session.day === day.date);
      return {
        sessions: sessions.length,
        pending: sessions.reduce((total, session) => total + session.counts.pending, 0),
        conflicts: sessions.filter((session) => session.conflicts.some((c) => c.severity === 'blocking')).length
      };
    })
  );
  protected readonly totals = computed(() => {
    const sessions = this.overview()?.sessions ?? [];
    return {
      pending: sessions.reduce((total, session) => total + session.counts.pending, 0),
      conflicts: sessions.filter((session) => session.conflicts.some((c) => c.severity === 'blocking')).length,
      registered: sessions.reduce((total, session) => total + session.counts.registered, 0)
    };
  });
  protected readonly panelOpen = computed(() => !!this.editing() || !!this.draft());

  protected readonly range = sessionRange;
  protected readonly dayLabel = festivalDayLabel;
  protected readonly typeLabels = SESSION_TYPE_LABELS;
  protected readonly style = typeStyle;

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async reload(): Promise<void> {
    try {
      this.overview.set(await this.api.overview());
      this.loadError.set('');
      const editing = this.editing();
      if (editing) this.editing.set(this.overview()!.sessions.find((session) => session.id === editing.id) ?? null);
    } catch (error) {
      this.loadError.set((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected openSession(session: IAdminSession): void {
    this.draft.set(null);
    this.editing.set(session);
  }

  protected newSession(create?: IGridCreate): void {
    this.editing.set(null);
    this.draft.set({
      day: this.activeDay()?.date ?? '2026-11-25',
      roomId: create?.roomId ?? null,
      startMinutes: create?.startMinutes ?? 10 * 60
    });
  }

  protected closePanel(): void {
    this.editing.set(null);
    this.draft.set(null);
  }

  protected async onSaved(session: IAdminSession | null): Promise<void> {
    await this.reload();
    if (session) {
      const fresh = this.overview()?.sessions.find((row) => row.id === session.id) ?? null;
      this.draft.set(null);
      this.editing.set(fresh);
      const index = this.days().findIndex((day) => day.date === fresh?.day);
      if (index >= 0) this.dayIndex.set(index);
    } else {
      this.closePanel();
    }
  }

  /** Drag/resize on the grid: optimistic update, conflicts confirmed explicitly, rollback on failure. */
  protected async onMove(move: IGridMove, acknowledge = false): Promise<void> {
    const day = move.session.day;
    const input: ISessionInput = {
      title: move.session.title,
      description: move.session.description,
      type: move.session.type,
      startsAt: kinshasaIso(day, move.startMinutes),
      endsAt: kinshasaIso(day, move.endMinutes),
      roomId: move.roomId,
      speakerIds: move.session.speakers.map((speaker) => speaker.id),
      visibility: move.session.visibility,
      admission: move.session.admission,
      capacity: move.session.capacity,
      waitlistEnabled: move.session.waitlistEnabled,
      acknowledgeConflicts: acknowledge,
      version: move.session.version
    };
    const previous = this.overview();
    this.patchLocal(move.session.id, { startsAt: input.startsAt, endsAt: input.endsAt, roomId: move.roomId });
    try {
      await this.api.update(move.session.id, input);
      this.pendingMove.set(null);
      this.toast.success(this.holders(move.session) ? 'Session déplacée, inscrits prévenus.' : 'Session déplacée.');
      await this.reload();
    } catch (error) {
      this.overview.set(previous);
      if (error instanceof ProgrammeApiError && error.code === 'CONFLICTS') {
        this.pendingMove.set({ move, conflicts: error.conflicts.filter((conflict) => conflict.severity === 'blocking') });
      } else {
        this.toast.error((error as Error).message);
        if (error instanceof ProgrammeApiError && error.code === 'STALE_VERSION') await this.reload();
      }
    }
  }

  protected holders(session: IAdminSession): number {
    return session.counts.registered + session.counts.pending + session.counts.waitlisted;
  }

  protected isBlocking(session: IAdminSession): boolean {
    return session.conflicts.some((conflict) => conflict.severity === 'blocking');
  }

  private patchLocal(id: string, changes: Partial<IAdminSession>): void {
    const overview = this.overview();
    if (!overview) return;
    const rooms = overview.rooms;
    this.overview.set({
      ...overview,
      sessions: overview.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              ...changes,
              room: changes.roomId === undefined ? session.room : (rooms.find((room) => room.id === changes.roomId) ?? null)
            }
          : session
      )
    });
  }
}
