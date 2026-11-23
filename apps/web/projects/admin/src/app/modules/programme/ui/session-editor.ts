import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Toast } from '@/app/core/toast';
import { festivalDayLabel, REGISTRATION_STATUS_LABELS, REGISTRATION_STATUS_TONES, SESSION_TYPE_LABELS } from '@/app/shared/helpers';
import { IApiSuccess, IProgrammeAdmission, IProgrammeDayInfo, ISpeaker } from '@/app/shared/interfaces';
import { ProgrammeAdminApi, ProgrammeApiError } from '../data-access/programme-admin.api';
import {
  IAdminSession,
  IAttendee,
  IConflict,
  IRoom,
  ISessionChangeEntry,
  ISessionInput,
  IVisibility
} from '../interfaces/programme-admin.interface';
import { GRID_END, GRID_START } from './schedule-grid';
import { fromHHMM, kinshasaIso, kinshasaMinutes, toHHMM } from './session-style';

export interface IEditorDraft {
  day: string;
  roomId: string | null;
  startMinutes: number;
}

interface IForm {
  title: string;
  description: string;
  type: string;
  day: string;
  start: string;
  end: string;
  roomId: string | null;
  speakerIds: string[];
  visibility: IVisibility;
  admission: IProgrammeAdmission;
  capacity: number | null;
  waitlistEnabled: boolean;
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

/** Side panel to create or edit a session: details with live conflict check, attendees, history (PRD-002 §5.2–5.5). */
@Component({
  selector: 'session-editor',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  templateUrl: './session-editor.html',
  host: { class: 'flex h-full flex-col' }
})
export class SessionEditor {
  readonly session = input<IAdminSession | null>(null);
  readonly draft = input<IEditorDraft | null>(null);
  readonly days = input.required<IProgrammeDayInfo[]>();
  readonly rooms = input.required<IRoom[]>();

  readonly saved = output<IAdminSession | null>();
  readonly closed = output<void>();

  private readonly api = inject(ProgrammeAdminApi);
  private readonly toast = inject(Toast);

  protected readonly speakersResource = httpResource<IApiSuccess<ISpeaker[]>>(() => '/admin/speakers');
  protected readonly tab = signal<'details' | 'attendees' | 'history'>('details');
  protected readonly form = signal<IForm>(this.emptyForm());
  protected readonly conflicts = signal<IConflict[]>([]);
  protected readonly acknowledged = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly confirmAction = signal<'cancel' | 'delete' | null>(null);
  protected readonly cancelReason = signal('');
  protected readonly attendees = signal<IAttendee[]>([]);
  protected readonly attendeeEmail = signal('');
  protected readonly history = signal<ISessionChangeEntry[]>([]);

  protected readonly isNew = computed(() => !this.session());
  protected readonly blocking = computed(() => this.conflicts().filter((conflict) => conflict.severity === 'blocking'));
  protected readonly info = computed(() => this.conflicts().filter((conflict) => conflict.severity === 'info'));
  protected readonly holders = computed(() => {
    const counts = this.session()?.counts;
    return counts ? counts.registered + counts.pending + counts.waitlisted : 0;
  });
  /** Registrants are told about time, room, access and visibility changes — say so before saving. */
  protected readonly willNotify = computed(() => {
    const session = this.session();
    if (!session || !this.holders()) return false;
    const form = this.form();
    return (
      this.toIso(form.day, form.start) !== new Date(session.startsAt).toISOString() ||
      this.toIso(form.day, form.end) !== new Date(session.endsAt).toISOString() ||
      form.roomId !== (session.roomId ?? null) ||
      form.admission !== session.admission ||
      form.visibility !== session.visibility
    );
  });
  protected readonly durations = DURATIONS;
  protected readonly types = Object.entries(SESSION_TYPE_LABELS);
  protected readonly dayLabel = festivalDayLabel;
  protected readonly statusLabels = REGISTRATION_STATUS_LABELS;
  protected readonly statusTones = REGISTRATION_STATUS_TONES;
  protected readonly timeMin = toHHMM(GRID_START);
  protected readonly timeMax = toHHMM(GRID_END);

  private checkTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const session = this.session();
      const draft = this.draft();
      untracked(() => {
        this.form.set(session ? this.fromSession(session) : this.fromDraft(draft));
        this.tab.set('details');
        this.acknowledged.set(false);
        this.confirmAction.set(null);
        this.error.set('');
        this.attendees.set([]);
        this.history.set([]);
      });
    });

    // Live conflict check, debounced, on every change of the form.
    effect(() => {
      const form = this.form();
      untracked(() => {
        if (this.checkTimer) clearTimeout(this.checkTimer);
        this.checkTimer = setTimeout(() => void this.check(form), 350);
      });
    });
  }

  protected patch(changes: Partial<IForm>): void {
    this.form.update((form) => ({ ...form, ...changes }));
    this.acknowledged.set(false);
  }

  protected setDuration(minutes: number): void {
    const end = Math.min(GRID_END, fromHHMM(this.form().start) + minutes);
    this.patch({ end: toHHMM(end) });
  }

  protected durationOf(form: IForm): number {
    return fromHHMM(form.end) - fromHHMM(form.start);
  }

  protected async openTab(tab: 'details' | 'attendees' | 'history'): Promise<void> {
    this.tab.set(tab);
    const session = this.session();
    if (!session) return;
    try {
      if (tab === 'attendees') this.attendees.set(await this.api.attendees(session.id));
      if (tab === 'history') this.history.set(await this.api.history(session.id));
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }

  protected async save(): Promise<void> {
    const form = this.form();
    if (!form.title.trim()) {
      this.error.set('Le titre est obligatoire.');
      return;
    }
    if (this.durationOf(form) <= 0) {
      this.error.set('La fin doit être après le début.');
      return;
    }
    if (this.blocking().length && !this.acknowledged()) {
      this.error.set('Confirmez les conflits signalés, ou modifiez la session.');
      return;
    }
    await this.run(async () => {
      const input = this.toInput(form);
      const session = this.session();
      const result = session
        ? await this.api.update(session.id, { ...input, version: session.version })
        : await this.api.create(input);
      this.toast.success(session ? 'Session enregistrée.' : 'Session créée.');
      this.saved.emit(result);
    });
  }

  protected async duplicate(): Promise<void> {
    const session = this.session();
    if (!session) return;
    await this.run(async () => {
      const copy = await this.api.duplicate(session.id);
      this.toast.success('Session dupliquée — choisissez sa salle.');
      this.saved.emit(copy);
    });
  }

  protected async confirmCancel(): Promise<void> {
    const session = this.session();
    if (!session) return;
    await this.run(async () => {
      const result = await this.api.cancel(session.id, this.cancelReason());
      this.toast.success('Session annulée, les inscrits sont prévenus.');
      this.saved.emit(result);
    });
  }

  protected async restore(): Promise<void> {
    const session = this.session();
    if (!session) return;
    await this.run(async () => this.saved.emit(await this.api.restore(session.id)));
  }

  protected async confirmDelete(): Promise<void> {
    const session = this.session();
    if (!session) return;
    await this.run(async () => {
      await this.api.remove(session.id);
      this.toast.success('Session supprimée.');
      this.saved.emit(null);
    });
  }

  protected async addAttendee(): Promise<void> {
    const session = this.session();
    const email = this.attendeeEmail().trim();
    if (!session || !email) return;
    await this.run(async () => {
      this.attendees.set(await this.api.addAttendee(session.id, email));
      this.attendeeEmail.set('');
      this.toast.success('Participant ajouté.');
    });
  }

  protected async removeAttendee(attendee: IAttendee): Promise<void> {
    const session = this.session();
    if (!session) return;
    await this.run(async () => this.attendees.set(await this.api.removeAttendee(session.id, attendee.userId)));
  }

  protected async exportCsv(): Promise<void> {
    const session = this.session();
    if (!session) return;
    await this.run(() => this.api.downloadAttendees(session.id, `participants-${session.code ?? session.id}.csv`));
  }

  protected describe(entry: ISessionChangeEntry): string {
    if (entry.kind === 'CREATED') return 'Session créée';
    if (entry.kind === 'CANCELLED') return `Annulée${entry.after['reason'] ? ` — ${entry.after['reason']}` : ''}`;
    const labels: Record<string, string> = {
      startsAt: 'début',
      endsAt: 'fin',
      room: 'salle',
      status: 'statut',
      admission: 'accès',
      visibility: 'visibilité'
    };
    const fields = Object.keys(entry.after).filter((key) => key in labels).map((key) => labels[key]);
    const forced = entry.after['acknowledgedConflicts'] ? ' (conflit confirmé)' : '';
    return `Modifiée : ${fields.join(', ') || 'détails'}${forced}`;
  }

  private async check(form: IForm): Promise<void> {
    if (!form.title.trim() || this.durationOf(form) <= 0) {
      this.conflicts.set([]);
      return;
    }
    try {
      const { conflicts } = await this.api.check(this.toInput(form), this.session()?.id);
      this.conflicts.set(conflicts);
    } catch {
      this.conflicts.set([]);
    }
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (error) {
      if (error instanceof ProgrammeApiError && error.conflicts.length) this.conflicts.set(error.conflicts);
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  private toInput(form: IForm): ISessionInput {
    return {
      title: form.title.trim(),
      description: form.description,
      type: form.type,
      startsAt: this.toIso(form.day, form.start),
      endsAt: this.toIso(form.day, form.end),
      roomId: form.roomId,
      speakerIds: form.speakerIds,
      visibility: form.visibility,
      admission: form.admission,
      capacity: form.capacity && form.capacity > 0 ? form.capacity : null,
      waitlistEnabled: form.waitlistEnabled,
      acknowledgeConflicts: this.acknowledged()
    };
  }

  private toIso(day: string, time: string): string {
    return kinshasaIso(day, fromHHMM(time));
  }

  private fromSession(session: IAdminSession): IForm {
    return {
      title: session.title,
      description: session.description,
      type: session.type,
      day: session.day,
      start: toHHMM(kinshasaMinutes(session.startsAt)),
      end: toHHMM(kinshasaMinutes(session.endsAt)),
      roomId: session.roomId,
      speakerIds: session.speakers.map((speaker) => speaker.id),
      visibility: session.visibility,
      admission: session.admission,
      capacity: session.capacity,
      waitlistEnabled: session.waitlistEnabled
    };
  }

  private fromDraft(draft: IEditorDraft | null): IForm {
    const form = this.emptyForm();
    if (!draft) return form;
    return { ...form, day: draft.day, roomId: draft.roomId, start: toHHMM(draft.startMinutes), end: toHHMM(draft.startMinutes + 60) };
  }

  private emptyForm(): IForm {
    return {
      title: '',
      description: '',
      type: 'TALK',
      day: '2026-11-25',
      start: '10:00',
      end: '11:00',
      roomId: null,
      speakerIds: [],
      visibility: 'PUBLIC',
      admission: 'OPEN',
      capacity: null,
      waitlistEnabled: true
    };
  }
}
