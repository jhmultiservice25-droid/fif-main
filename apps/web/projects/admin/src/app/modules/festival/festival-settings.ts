import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { Toast } from '@/app/core/toast';
import { FestivalStore } from '@/app/shared/data-access';
import { IApiError, IApiSuccess, IFestivalDay, IFestivalDaysPreview, IFestivalInfo } from '@/app/shared/interfaces';

interface IDraft {
  name: string;
  shortName: string;
  city: string;
  country: string;
  days: IFestivalDay[];
  badgeDeadline: string | null;
  applicationsOpenAt: string | null;
  applicationsCloseAt: string | null;
}

/** Console › Festival: dates and identity. Moving a day moves its sessions and speakers with it. */
@Component({
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './festival-settings.html'
})
export default class FestivalSettings implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(Toast);
  private readonly store = inject(FestivalStore);

  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal<IFestivalInfo | null>(null);
  protected readonly draft = signal<IDraft | null>(null);
  protected readonly preview = signal<IFestivalDaysPreview | null>(null);

  protected readonly datesChanged = computed(() => {
    const draft = this.draft();
    const saved = this.saved();
    if (!draft || !saved) return false;
    return JSON.stringify(draft.days.map((day) => day.date)) !== JSON.stringify(saved.days.map((day) => day.date));
  });
  protected readonly impact = computed(() => {
    const moves = this.preview()?.moves ?? [];
    return {
      moves: moves.filter((move) => move.sessions || move.speakers),
      sessions: moves.reduce((total, move) => total + move.sessions, 0),
      speakers: moves.reduce((total, move) => total + move.speakers, 0)
    };
  });

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async reload(): Promise<void> {
    try {
      const { data } = await firstValueFrom(this.http.get<IApiSuccess<IFestivalInfo>>('/admin/festival'));
      this.apply(data);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected patch(changes: Partial<IDraft>): void {
    this.draft.update((draft) => (draft ? { ...draft, ...changes } : draft));
  }

  protected patchDay(index: number, changes: Partial<IFestivalDay>): void {
    this.draft.update((draft) => {
      if (!draft) return draft;
      const days = draft.days.map((day, position) => (position === index ? { ...day, ...changes } : day));
      return { ...draft, days };
    });
    if (changes.date) void this.refreshPreview();
  }

  protected addDay(): void {
    this.draft.update((draft) => {
      if (!draft) return draft;
      const last = draft.days[draft.days.length - 1];
      const next = last ? new Date(new Date(`${last.date}T12:00:00Z`).getTime() + 86_400_000) : new Date();
      return {
        ...draft,
        days: [...draft.days, { date: next.toISOString().slice(0, 10), label: `Jour ${draft.days.length + 1}`, theme: '' }]
      };
    });
    void this.refreshPreview();
  }

  protected removeDay(index: number): void {
    this.draft.update((draft) => (draft ? { ...draft, days: draft.days.filter((_, position) => position !== index) } : draft));
    void this.refreshPreview();
  }

  /** Shifts every later day by the same number of days, which is what moving a festival usually means. */
  protected shiftAll(days: number): void {
    this.draft.update((draft) => {
      if (!draft) return draft;
      return {
        ...draft,
        days: draft.days.map((day) => ({
          ...day,
          date: new Date(new Date(`${day.date}T12:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10)
        }))
      };
    });
    void this.refreshPreview();
  }

  protected async save(): Promise<void> {
    const draft = this.draft();
    if (!draft) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const { data } = await firstValueFrom(
        this.http.put<IApiSuccess<IFestivalInfo & { movedDays: number }>>('/admin/festival', draft)
      );
      this.apply(data);
      this.store.set(data);
      this.toast.success(
        data.movedDays ? `Dates enregistrées : ${data.movedDays} jour(s) déplacé(s) avec leurs sessions.` : 'Réglages enregistrés.'
      );
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected reset(): void {
    const saved = this.saved();
    if (saved) this.apply(saved);
  }

  /** `datetime-local` works in local time; the festival runs on Kinshasa time (UTC+1). */
  protected toLocal(value: string | null): string {
    return value ? new Date(new Date(value).getTime() + 3_600_000).toISOString().slice(0, 16) : '';
  }

  protected fromLocal(value: string): string | null {
    return value ? new Date(`${value}:00+01:00`).toISOString() : null;
  }

  protected dayName(date: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
      new Date(`${date}T12:00:00Z`)
    );
  }

  private async refreshPreview(): Promise<void> {
    const draft = this.draft();
    if (!draft || !this.datesChanged()) {
      this.preview.set(null);
      return;
    }
    try {
      const { data } = await firstValueFrom(
        this.http.post<IApiSuccess<IFestivalDaysPreview>>('/admin/festival/preview', { days: draft.days })
      );
      this.preview.set(data);
    } catch {
      this.preview.set(null);
    }
  }

  private apply(info: IFestivalInfo): void {
    this.saved.set(info);
    this.draft.set({
      name: info.name,
      shortName: info.shortName,
      city: info.city,
      country: info.country,
      days: info.days.map((day) => ({ ...day })),
      badgeDeadline: info.badgeDeadline,
      applicationsOpenAt: info.applicationsOpenAt,
      applicationsCloseAt: info.applicationsCloseAt
    });
    this.preview.set(null);
  }

  private message(error: unknown): string {
    return ((error as HttpErrorResponse).error as IApiError | undefined)?.message ?? 'Action impossible pour le moment.';
  }
}
