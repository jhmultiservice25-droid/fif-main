import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Analytics } from '@/app/core/analytics';
import { AuthStore } from '@/app/domains/auth/data-access/auth.store';
import {
  festivalDayLabel,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_TONES,
  SESSION_TYPE_LABELS,
  sessionRange,
  sessionsOverlap
} from '@/app/shared/helpers';
import {
  IApiError,
  IApiSuccess,
  IJoinResult,
  IMyProgramme,
  IParticipantIdentity,
  IProgramme,
  IProgrammeDay,
  IProgrammeSession,
  IRegistrationStatus
} from '@/app/shared/interfaces';

export interface IRegistrationDialogData {
  /** Festival day (YYYY-MM-DD) the modal opens on. */
  initialDay?: string;
}

type IStep = 'sessions' | 'email' | 'identity' | 'done';

/** Identity as edited in the modal; organization stays a string so the form field is always defined. */
type IIdentityModel = Required<IParticipantIdentity>;

/** Contract of POST /programme/register (backend v2). No login cookie is issued. */
interface IRegisterDirectResult {
  registered: boolean;
  codeSent: boolean;
  emailVerified: boolean;
  participantId: string;
  results: IJoinResult[];
  qrCodeDataUrl: string | null;
  privateSpaceRequiresLogin: boolean;
}

interface IDoneRow {
  sessionId: string;
  title: string;
  status: IRegistrationStatus;
  isNew: boolean;
}

interface IDoneState {
  rows: IDoneRow[];
  qrCodeDataUrl: string | null;
  /** True when the e-mail already had a programme: earlier picks are listed with the new ones. */
  existing: boolean;
  removed: number;
}

interface IDraft {
  step: IStep | 'code'; // Accept saved drafts from the former OTP flow.
  dayIndex: number;
  selected: string[];
  email: string;
  identity: IIdentityModel;
}

const DRAFT_KEY = 'fif-registration-draft';

const emptyIdentity = (): IIdentityModel => ({
  firstName: '',
  lastName: '',
  postnom: '',
  city: '',
  whatsapp: '',
  organization: ''
});

/** Restores an interrupted registration (reload/navigation); no e-mail code is needed. */
export function readRegistrationDraft(): IDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as IDraft) : null;
  } catch {
    return null;
  }
}

@Component({
  selector: 'registration-dialog',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './registration-dialog.html',
  host: { class: 'relative flex h-dvh flex-col sm:h-auto sm:max-h-[min(90dvh,860px)]' },
  styles: `
    .day-in-next {
      animation: reg-in-next 280ms cubic-bezier(0.2, 0.7, 0.2, 1);
    }
    .day-in-prev {
      animation: reg-in-prev 280ms cubic-bezier(0.2, 0.7, 0.2, 1);
    }
    @keyframes reg-in-next {
      from {
        opacity: 0;
        transform: translateX(24px);
      }
    }
    @keyframes reg-in-prev {
      from {
        opacity: 0;
        transform: translateX(-24px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .day-in-next,
      .day-in-prev {
        animation: none;
      }
    }
  `
})
export class RegistrationDialog implements OnInit {
  private readonly data = inject<IRegistrationDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RegistrationDialog>);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly authStore = inject(AuthStore);
  private readonly analytics = inject(Analytics);

  protected readonly days = signal<IProgrammeDay[]>([]);
  protected readonly loading = signal(true);
  protected readonly step = signal<IStep>('sessions');
  protected readonly dayIndex = signal(0);
  protected readonly direction = signal<'next' | 'prev'>('next');
  protected readonly selected = signal<string[]>([]);
  protected readonly alreadyHeld = signal<Map<string, IRegistrationStatus>>(new Map());
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly confirmLeave = signal(false);
  protected readonly result = signal<IDoneState | null>(null);
  /** Sessions the signed-in attendee already holds that they unticked: cancelled on confirm. */
  protected readonly toRemove = signal<string[]>([]);

  protected readonly emailModel = signal({ email: '' });
  protected readonly emailForm = form(this.emailModel, (path) => {
    required(path.email);
    email(path.email);
  });
  protected readonly identityModel = signal<IIdentityModel>(emptyIdentity());
  protected readonly identityForm = form(this.identityModel, (path) => {
    required(path.firstName);
    required(path.lastName);
    required(path.postnom);
    required(path.city);
    required(path.whatsapp);
  });

  protected readonly signedIn = computed(() => this.authStore.isAttendee());
  protected readonly activeDay = computed(() => this.days()[this.dayIndex()] ?? null);
  protected readonly allSessions = computed(() => this.days().flatMap((day) => day.sessions));
  protected readonly selectedSessions = computed(() =>
    this.allSessions().filter((session) => this.selected().includes(session.id))
  );
  protected readonly selectedDays = computed(() =>
    this.days()
      .filter((day) => day.sessions.some((session) => this.isChecked(session)))
      .map((day) => day.label.replace('Jour ', 'J'))
  );
  protected readonly countByDay = computed(() =>
    this.days().map((day) => day.sessions.filter((session) => this.isChecked(session)).length)
  );
  protected readonly checkedCount = computed(() => this.countByDay().reduce((total, count) => total + count, 0));
  protected readonly hasChanges = computed(() => this.selected().length > 0 || this.toRemove().length > 0);
  protected readonly isDirty = computed(
    () =>
      this.step() !== 'done' && (this.selected().length > 0 || this.toRemove().length > 0 || !!this.emailModel().email)
  );
  protected readonly stepNumber = computed(() => {
    const step = this.step();
    return step === 'sessions' ? 1 : step === 'email' ? 2 : 3;
  });

  protected readonly range = sessionRange;
  protected readonly dayLabel = festivalDayLabel;
  protected readonly typeLabels = SESSION_TYPE_LABELS;
  protected readonly statusLabels = REGISTRATION_STATUS_LABELS;
  protected readonly statusTones = REGISTRATION_STATUS_TONES;

  private closed = false;
  private readonly onPopState = () => {
    // Phone back button: never drop the visitor's work silently.
    if (this.isDirty()) {
      history.pushState({ fifRegistration: true }, '');
      this.confirmLeave.set(true);
    } else {
      this.close(false);
    }
  };

  constructor() {
    // Register inside Angular's injection context; not inside the popstate callback.
    effect(() => {
      this.selected();
      this.emailModel();
      this.identityModel();
      this.step();
      this.dayIndex();
      if (!this.loading() && this.step() !== 'done' && !this.closed) untracked(() => this.saveDraft());
    });
    this.dialogRef.backdropClick().subscribe(() => this.requestClose());
    this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (this.confirmLeave()) {
          this.confirmLeave.set(false);
        } else {
          this.requestClose();
        }
      }
    });
    history.pushState({ fifRegistration: true }, '');
    window.addEventListener('popstate', this.onPopState);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('popstate', this.onPopState);
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const { data } = await firstValueFrom(this.http.get<IApiSuccess<IProgramme>>('/programme'));
      this.days.set(data.days);
      const draft = readRegistrationDraft();
      if (draft) {
        this.selected.set(draft.selected.filter((id) => data.days.some((day) => day.sessions.some((s) => s.id === id))));
        this.emailModel.set({ email: draft.email });
        this.identityModel.set({ ...emptyIdentity(), ...draft.identity });
        this.dayIndex.set(Math.min(draft.dayIndex, data.days.length - 1));
        // Old drafts stopped at the OTP step now resume at the identity form.
        // Backward compatibility for visitors with an older OTP registration draft.
        this.step.set(draft.step === 'code' ? 'identity' : draft.step === 'done' ? 'sessions' : draft.step);
      } else {
        const index = data.days.findIndex((day) => day.date === this.data.initialDay);
        this.dayIndex.set(Math.max(index, 0));
      }
      if (this.signedIn()) await this.loadHeld();
    } catch {
      this.error.set('Le programme n’a pas pu être chargé. Vérifiez votre connexion.');
    } finally {
      this.loading.set(false);
    }
  }

  // --- Sessions step -------------------------------------------------------

  protected selectDay(index: number): void {
    if (index === this.dayIndex()) return;
    this.direction.set(index > this.dayIndex() ? 'next' : 'prev');
    this.dayIndex.set(index);
  }

  protected selectable(session: IProgrammeSession): boolean {
    return session.admission !== 'NONE' && session.status === 'SCHEDULED';
  }

  /** Ticked = newly picked, or already held and not marked for removal. */
  protected isChecked(session: IProgrammeSession): boolean {
    if (this.alreadyHeld().has(session.id)) return !this.toRemove().includes(session.id);
    return this.selected().includes(session.id);
  }

  protected toggle(session: IProgrammeSession): void {
    if (!this.selectable(session)) return;
    const flip = (ids: string[]) => (ids.includes(session.id) ? ids.filter((id) => id !== session.id) : [...ids, session.id]);
    if (this.alreadyHeld().has(session.id)) {
      this.toRemove.update(flip);
    } else {
      this.selected.update(flip);
    }
  }

  protected overlapsWith(session: IProgrammeSession): string[] {
    if (!this.isChecked(session)) return [];
    return this.allSessions()
      .filter((other) => other.id !== session.id && this.isChecked(other) && sessionsOverlap(session, other))
      .map((other) => other.title);
  }

  protected continueFromSessions(): void {
    if (this.signedIn() ? !this.hasChanges() : !this.selected().length) return;
    this.analytics.track('registration_started', { sessions: this.selected().length });
    if (this.signedIn()) {
      void this.joinSignedIn();
    } else {
      this.go('email');
    }
  }

  // --- Guest flow ----------------------------------------------------------

  protected async submitEmail(): Promise<void> {
    if (this.emailForm().invalid()) return;
    // Public registration never invokes /programme/interest (OTP endpoint).
    this.go('identity');
  }

  protected async submitIdentity(): Promise<void> {
    if (this.emailForm().invalid() || this.identityForm().invalid()) return;
    await this.registerDirect();
  }

  // --- Signed-in flow ------------------------------------------------------

  protected async notMe(): Promise<void> {
    if (this.signedIn()) {
      await firstValueFrom(this.authStore.signOutQuietly());
    }
    this.alreadyHeld.set(new Map());
    this.toRemove.set([]);
    this.emailModel.set({ email: '' });
    this.identityModel.set(emptyIdentity());
    this.step.set('sessions');
  }

  /** Same sessions, a different person: sign this device out and start again (PRD-001 §5.2). */
  protected async registerSomeoneElse(): Promise<void> {
    const keep = this.result()?.rows.map((row) => row.sessionId) ?? this.selected();
    await this.notMe();
    this.selected.set(keep);
    this.result.set(null);
    this.saveDraft();
  }

  /** Back to the session list with everything already held ticked, to add or untick picks. */
  protected async modifyPicks(): Promise<void> {
    this.result.set(null);
    this.selected.set([]);
    this.toRemove.set([]);
    await this.loadHeld();
    this.step.set('sessions');
  }

  protected openSpace(): void {
    this.close(false);
    void this.router.navigateByUrl(this.authStore.homeRoute());
  }

  private async joinSignedIn(): Promise<void> {
    await this.run(async () => {
      const removals = this.toRemove();
      for (const sessionId of removals) {
        await firstValueFrom(this.http.delete(`/me/programme/sessions/${encodeURIComponent(sessionId)}`));
      }
      const added = new Set<string>();
      if (this.selected().length) {
        const { data } = await firstValueFrom(
          this.http.post<IApiSuccess<IJoinResult[]>>('/me/programme/sessions', { sessionIds: this.selected() })
        );
        data.forEach((row) => added.add(row.sessionId));
      }
      this.result.set({ rows: await this.fullProgramme(added), qrCodeDataUrl: null, existing: true, removed: removals.length });
      this.finish();
    });
  }

  /** Everything the attendee now holds, newest picks flagged — so earlier choices are never invisible. */
  private async fullProgramme(added: Set<string>): Promise<IDoneRow[]> {
    const { data } = await firstValueFrom(this.http.get<IApiSuccess<IMyProgramme>>('/me/programme'));
    return data.items
      .filter((item) => item.status !== 'DECLINED')
      .map((item) => ({
        sessionId: item.session.id,
        title: item.session.title,
        status: item.status,
        isNew: added.has(item.session.id)
      }));
  }

  private async loadHeld(): Promise<void> {
    try {
      const { data } = await firstValueFrom(this.http.get<IApiSuccess<IMyProgramme>>('/me/programme'));
      // Declined requests can be asked again, so they are not treated as held.
      this.alreadyHeld.set(
        new Map(data.items.filter((item) => item.status !== 'DECLINED').map((item) => [item.session.id, item.status]))
      );
      this.selected.update((ids) => ids.filter((id) => !this.alreadyHeld().has(id)));
    } catch {
      this.alreadyHeld.set(new Map());
    }
  }

  // --- Closing -------------------------------------------------------------

  protected requestClose(): void {
    if (this.isDirty()) {
      this.confirmLeave.set(true);
    } else {
      this.close(true);
    }
  }

  protected leave(): void {
    this.close(true);
  }

  private close(clearDraft: boolean): void {
    this.closed = true;
    if (clearDraft) this.clearDraft();
    window.removeEventListener('popstate', this.onPopState);
    if (history.state?.fifRegistration) history.back();
    this.dialogRef.close();
  }

  // --- Helpers -------------------------------------------------------------

  protected go(step: IStep): void {
    this.error.set('');
    this.step.set(step);
    this.saveDraft();
  }

  /** Direct public registration; unlike OTP verification, this DOES NOT authenticate the visitor. */
  private async registerDirect(): Promise<void> {
    if (this.busy()) return;
    await this.run(async () => {
      const identity = this.identityModel();
      const { data } = await firstValueFrom(
        this.http.post<IApiSuccess<IRegisterDirectResult>>('/programme/register', {
          email: this.emailModel().email.trim().toLowerCase(),
          sessionIds: this.selected(),
          identity: { ...identity, organization: identity.organization || undefined }
        })
      );
      if (!data.registered) throw new Error('La confirmation de votre inscription est indisponible.');
      this.result.set({
        rows: data.results.map((row) => ({ ...row, status: row.status as IRegistrationStatus, isNew: true })),
        qrCodeDataUrl: data.qrCodeDataUrl,
        existing: false,
        removed: 0
      });
      // IMPORTANT: no initialize(), no login cookie and no entry to a private space.
      this.finish();
    });
  }

  private async run(action: () => Promise<void>, onError?: () => void): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (error) {
      const apiError = (error as HttpErrorResponse).error as IApiError | undefined;
      this.error.set(apiError?.message ?? 'Une erreur est survenue. Réessayez.');
      onError?.();
    } finally {
      this.busy.set(false);
    }
  }

  private finish(): void {
    this.analytics.track('registration_completed', { sessions: this.result()?.rows.length ?? 0 });
    this.clearDraft();
    this.step.set('done');
  }

  private saveDraft(): void {
    try {
      const draft: IDraft = {
        step: this.step(),
        dayIndex: this.dayIndex(),
        selected: this.selected(),
        email: this.emailModel().email,
        identity: this.identityModel()
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable: the flow still works, it just cannot be resumed */
    }
  }

  private clearDraft(): void {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }
}
