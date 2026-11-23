import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { Toast } from '@/app/core/toast';
import {
  festivalDayLabel,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_TONES,
  SESSION_TYPE_LABELS,
  sessionRange,
  sessionTime
} from '@/app/shared/helpers';
import { IApiSuccess, IMyProgramme, IMyProgrammeItem, IProgrammeChange } from '@/app/shared/interfaces';
import { DayCalendar } from '../day-calendar/day-calendar';
import { RegistrationLauncher } from '../registration-launcher';

/** "Mon programme": list and calendar of the attendee's sessions (participants, innovators, organizations). */
@Component({
  selector: 'my-programme',
  imports: [DayCalendar, MatButtonModule, MatIconModule],
  templateUrl: './my-programme.html'
})
export default class MyProgramme {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(Toast);
  private readonly launcher = inject(RegistrationLauncher);

  protected readonly resource = httpResource<IApiSuccess<IMyProgramme>>(() => '/me/programme');
  protected readonly view = signal<'list' | 'calendar'>('list');
  protected readonly dayIndex = signal(0);
  protected readonly confirming = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly detail = signal<IMyProgrammeItem | null>(null);

  protected readonly data = computed(() => (this.resource.hasValue() ? this.resource.value().data : null));
  protected readonly items = computed(() => this.data()?.items ?? []);
  protected readonly days = computed(() =>
    (this.data()?.days ?? []).map((day) => ({
      ...day,
      items: this.items().filter((item) => item.session.day === day.date)
    }))
  );
  protected readonly changedCount = computed(() => this.items().filter((item) => item.changes.length).length);

  protected readonly range = sessionRange;
  protected readonly dayLabel = festivalDayLabel;
  protected readonly typeLabels = SESSION_TYPE_LABELS;
  protected readonly statusLabels = REGISTRATION_STATUS_LABELS;
  protected readonly statusTones = REGISTRATION_STATUS_TONES;

  protected async addSessions(): Promise<void> {
    await this.launcher.open({ initialDay: this.days()[this.dayIndex()]?.date });
    this.resource.reload();
  }

  protected async cancel(item: IMyProgrammeItem): Promise<void> {
    if (this.confirming() !== item.session.id) {
      this.confirming.set(item.session.id);
      return;
    }
    this.busy.set(item.session.id);
    try {
      await firstValueFrom(this.http.delete(`/me/programme/sessions/${encodeURIComponent(item.session.id)}`));
      this.toast.success(item.status === 'PENDING' ? 'Demande retirée.' : 'Vous êtes désinscrit(e).');
      this.detail.set(null);
      this.resource.reload();
    } catch {
      this.toast.error('Action impossible pour le moment.');
    } finally {
      this.busy.set(null);
      this.confirming.set(null);
    }
  }

  protected async markSeen(): Promise<void> {
    await firstValueFrom(this.http.post('/me/programme/seen', {}));
    this.resource.reload();
  }

  protected describeChange(change: IProgrammeChange): string {
    const before = change.before as Record<string, string | null>;
    const after = change.after as Record<string, string | null>;
    const parts: string[] = [];
    if (after['startsAt'] && before['startsAt'] !== after['startsAt']) {
      parts.push(`${sessionTime(before['startsAt']!)} → ${sessionTime(after['startsAt'])}`);
    }
    if ('room' in after && before['room'] !== after['room']) parts.push(`salle : ${after['room'] ?? 'à confirmer'}`);
    if (after['status'] === 'CANCELLED') parts.push('session annulée');
    return parts.join(' · ') || 'Informations mises à jour';
  }

  protected cancelLabel(item: IMyProgrammeItem): string {
    if (this.confirming() === item.session.id) return 'Confirmer ?';
    return item.status === 'PENDING' ? 'Retirer ma demande' : 'Me désinscrire';
  }
}
