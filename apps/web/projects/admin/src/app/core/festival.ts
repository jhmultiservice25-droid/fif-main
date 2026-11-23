import { computed, inject, Injectable } from '@angular/core';
import { FestivalStore } from '@/app/shared/data-access';

const DAY_MS = 86_400_000;

export interface IFestivalStatus {
  label: string;
  tone: 'upcoming' | 'live' | 'done';
}

/** Countdown / live state shown in the console chrome, from the dates admins set. */
@Injectable({ providedIn: 'root' })
export class FestivalChrome {
  private readonly store = inject(FestivalStore);

  readonly info = this.store.info;
  readonly label = computed(() => {
    const info = this.info();
    return [info.dateLabel, info.city].filter(Boolean).join(' · ');
  });

  readonly status = computed<IFestivalStatus>(() => {
    const info = this.info();
    if (!info.startsAt || !info.endsAt) return { label: 'Dates à définir', tone: 'upcoming' };
    const now = Date.now();
    const start = new Date(info.startsAt).getTime();
    const end = new Date(info.endsAt).getTime();
    if (now < start) {
      const days = Math.ceil((start - now) / DAY_MS);
      return { label: days <= 1 ? 'Demain' : `J-${days}`, tone: 'upcoming' };
    }
    if (now <= end) {
      const day = Math.floor((now - start) / DAY_MS) + 1;
      return { label: `En cours · Jour ${Math.min(day, info.days.length || 3)}`, tone: 'live' };
    }
    return { label: 'Terminé', tone: 'done' };
  });
}
