import { httpResource } from '@angular/common/http';
import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { festivalDayLabel, SESSION_TYPE_LABELS, sessionRange } from '@/app/shared/helpers';
import { IApiSuccess, IProgramme, IProgrammeSession } from '@/app/shared/interfaces';
import { groupBySlot } from '../../../programme/programme-groups';
import { Analytics } from '@/app/core/analytics';
import { FestivalStore } from '@/app/shared/data-access';
import { RegistrationLauncher } from '../../../programme/registration-launcher';

function hasDraft(): boolean {
  try {
    return !!sessionStorage.getItem('fif-registration-draft');
  } catch {
    return false;
  }
}

@Component({
  selector: 'program',
  imports: [MatIconModule],
  templateUrl: './program.html',
  styles: `
    .day-in-next {
      animation: day-in-next 320ms cubic-bezier(0.2, 0.7, 0.2, 1);
    }
    .day-in-prev {
      animation: day-in-prev 320ms cubic-bezier(0.2, 0.7, 0.2, 1);
    }
    @keyframes day-in-next {
      from {
        opacity: 0;
        transform: translateX(32px) rotateY(-6deg);
      }
    }
    @keyframes day-in-prev {
      from {
        opacity: 0;
        transform: translateX(-32px) rotateY(6deg);
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
export class Program {
  private readonly launcher = inject(RegistrationLauncher);
  protected readonly festival = inject(FestivalStore).info;
  private readonly analytics = inject(Analytics);

  protected readonly programmeResource = httpResource<IApiSuccess<IProgramme>>(() => '/programme');
  protected readonly days = computed(() => (this.programmeResource.hasValue() ? this.programmeResource.value().data.days : []));
  protected readonly activeIndex = signal(0);
  protected readonly direction = signal<'next' | 'prev'>('next');
  protected readonly openKey = signal<string | null>(null);

  protected readonly activeDay = computed(() => this.days()[this.activeIndex()] ?? null);
  protected readonly slots = computed(() => groupBySlot(this.activeDay()?.sessions ?? []));

  protected readonly dayLabel = festivalDayLabel;
  protected readonly range = sessionRange;
  protected readonly typeLabels = SESSION_TYPE_LABELS;

  private touchStart: { x: number; y: number } | null = null;

  constructor() {
    const route = inject(ActivatedRoute);
    const router = inject(Router);
    afterNextRender(() => {
      // "Participer" links elsewhere point to /?participer=1; an interrupted registration resumes on its own.
      if (route.snapshot.queryParamMap.get('participer')) {
        void router.navigate([], { queryParams: { participer: null }, queryParamsHandling: 'merge', replaceUrl: true });
        void this.launcher.open();
      } else if (hasDraft()) {
        void this.launcher.open();
      }
    });
  }

  protected selectDay(index: number): void {
    if (index === this.activeIndex() || index < 0 || index >= this.days().length) return;
    this.direction.set(index > this.activeIndex() ? 'next' : 'prev');
    this.activeIndex.set(index);
    this.openKey.set(null);
  }

  protected toggle(key: string): void {
    this.openKey.update((current) => (current === key ? null : key));
  }

  protected participate(): void {
    this.analytics.track('cta_click', { cta: 'participer', place: 'programme' });
    void this.launcher.open({ initialDay: this.activeDay()?.date });
  }

  protected registrable(sessions: IProgrammeSession[]): boolean {
    return sessions.some((session) => session.admission !== 'NONE' && session.status === 'SCHEDULED');
  }

  protected onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  protected onTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    if (!this.touchStart || !touch) return;
    const dx = touch.clientX - this.touchStart.x;
    const dy = touch.clientY - this.touchStart.y;
    this.touchStart = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      this.selectDay(this.activeIndex() + (dx < 0 ? 1 : -1));
    }
  }
}
