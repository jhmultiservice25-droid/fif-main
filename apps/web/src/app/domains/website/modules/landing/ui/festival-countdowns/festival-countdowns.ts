import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FestivalStore } from '@/app/shared/data-access';

export interface CountdownTarget {
  readonly label: string;
  readonly deadline: string;
  readonly target: string;
}

interface CountdownView extends CountdownTarget {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly expired: boolean;
}

@Component({
  selector: 'festival-countdowns',
  templateUrl: './festival-countdowns.html'
})
export class FestivalCountdowns implements OnDestroy {
  private readonly festival = inject(FestivalStore).info;
  private readonly now = signal(Date.now());

  /** Dates come from the festival settings, so admins never need a deploy to move them. */
  private readonly targets = computed<readonly CountdownTarget[]>(() => {
    const info = this.festival();
    const entries: CountdownTarget[] = [];
    if (info.startsAt) {
      entries.push({ label: `${info.name} ${info.shortName.replace(/\D/g, '')}`.trim(), deadline: info.dateLabel, target: info.startsAt });
    }
    if (info.applicationsCloseAt) {
      entries.push({
        label: 'Clôture des candidatures — solutions innovantes',
        deadline: this.deadlineLabel(info.applicationsCloseAt),
        target: info.applicationsCloseAt
      });
    }
    if (info.badgeDeadline) {
      entries.push({
        label: 'Clôture de génération du badge participant',
        deadline: this.deadlineLabel(info.badgeDeadline),
        target: info.badgeDeadline
      });
    }
    return entries;
  });

  protected readonly countdowns = computed<readonly CountdownView[]>(() => this.calculate());

  private readonly timer = setInterval(() => this.now.set(Date.now()), 1000);

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private deadlineLabel(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Kinshasa'
    })
      .format(new Date(value))
      .replace(':', 'h');
  }

  private calculate(): readonly CountdownView[] {
    const now = this.now();

    return this.targets().map((item) => {
      const remaining = Math.max(0, new Date(item.target).getTime() - now);
      return {
        ...item,
        days: Math.floor(remaining / 86_400_000),
        hours: Math.floor((remaining % 86_400_000) / 3_600_000),
        minutes: Math.floor((remaining % 3_600_000) / 60_000),
        seconds: Math.floor((remaining % 60_000) / 1000),
        expired: remaining === 0
      };
    });
  }
}
