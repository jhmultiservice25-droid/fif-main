import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IApiSuccess, IFestivalInfo } from '@/app/shared/interfaces';

/** Festival name, dates and deadlines, set by admins and read by every page that shows them. */
const FALLBACK: IFestivalInfo = {
  name: 'FIKIRI Innovation Festival',
  shortName: 'FIF 2026',
  city: 'Kinshasa',
  country: 'RDC',
  location: 'Kinshasa, RDC',
  days: [],
  dateLabel: '',
  shortDateLabel: '',
  startsAt: null,
  endsAt: null,
  badgeDeadline: null,
  applicationsOpenAt: null,
  applicationsCloseAt: null,
  applicationsOpen: true,
  analyticsMeasurementId: null,
  updatedAt: ''
};

@Injectable({ providedIn: 'root' })
export class FestivalStore {
  private readonly http = inject(HttpClient);
  private readonly state = signal<IFestivalInfo>(FALLBACK);
  private loaded = false;

  readonly info = this.state.asReadonly();
  readonly days = computed(() => this.state().days);
  readonly dateLabel = computed(() => this.state().dateLabel);

  /** Loaded once at startup; `set` keeps it fresh after an admin saves new dates. */
  async load(): Promise<IFestivalInfo> {
    if (this.loaded) return this.state();
    try {
      const { data } = await firstValueFrom(this.http.get<IApiSuccess<IFestivalInfo>>('/festival'));
      this.state.set(data);
      this.loaded = true;
    } catch {
      /* keep the fallback: the site still renders without the API */
    }
    return this.state();
  }

  set(info: IFestivalInfo): void {
    this.state.set(info);
    this.loaded = true;
  }
}
