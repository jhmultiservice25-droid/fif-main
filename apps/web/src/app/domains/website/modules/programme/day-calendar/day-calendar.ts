import { Component, computed, input, output } from '@angular/core';
import { sessionRange } from '@/app/shared/helpers';
import { IMyProgrammeItem } from '@/app/shared/interfaces';

const START_HOUR = 8;
const END_HOUR = 23;
const HOUR_PX = 64;

interface IBlock {
  item: IMyProgrammeItem;
  top: number;
  height: number;
  column: number;
  columns: number;
}

const minutesOfDay = (value: string) => {
  // Kinshasa is UTC+1 all year.
  const date = new Date(new Date(value).getTime() + 60 * 60 * 1000);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
};

/** One festival day as a vertical time grid; overlapping sessions sit side by side. */
@Component({
  selector: 'day-calendar',
  template: `
    <div class="relative flex" [style.height.px]="(endHour - startHour) * hourPx">
      <div class="w-12 shrink-0 select-none">
        @for (hour of hours; track hour) {
          <div class="relative text-right text-[11px] text-gray-400 tabular-nums" [style.height.px]="hourPx">
            <span class="absolute -top-2 right-2">{{ hour }}h</span>
          </div>
        }
      </div>
      <div class="relative flex-auto border-l border-gray-100">
        @for (hour of hours; track hour) {
          <div class="border-t border-gray-100" [style.height.px]="hourPx"></div>
        }
        @for (block of blocks(); track block.item.session.id) {
          <button
            type="button"
            class="absolute overflow-hidden rounded-xl border px-2.5 py-1.5 text-left text-xs transition hover:shadow-[0_6px_16px_-6px_rgb(4_19_31/0.25)]"
            [class]="tone(block.item)"
            [style.top.px]="block.top"
            [style.height.px]="block.height"
            [style.left]="'calc(' + (block.column / block.columns) * 100 + '% + 4px)'"
            [style.width]="'calc(' + 100 / block.columns + '% - 8px)'"
            (click)="selected.emit(block.item)">
            <span class="flex items-center gap-1.5">
              <span class="size-1.5 shrink-0 rounded-full" [class]="dot(block.item)"></span>
              <span class="truncate font-semibold">{{ block.item.session.title }}</span>
            </span>
            <span class="block truncate opacity-80">{{ range(block.item.session) }}</span>
          </button>
        }
      </div>
    </div>
  `
})
export class DayCalendar {
  readonly items = input.required<IMyProgrammeItem[]>();
  readonly selected = output<IMyProgrammeItem>();

  protected readonly startHour = START_HOUR;
  protected readonly endHour = END_HOUR;
  protected readonly hourPx = HOUR_PX;
  protected readonly hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  protected readonly range = sessionRange;

  protected readonly blocks = computed<IBlock[]>(() => {
    const sorted = [...this.items()].sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt));
    const blocks: IBlock[] = [];
    let cluster: IBlock[] = [];
    let clusterEnd = -1;
    const flush = () => {
      const columns = Math.max(1, ...cluster.map((block) => block.column + 1));
      cluster.forEach((block) => (block.columns = columns));
      cluster = [];
    };
    for (const item of sorted) {
      const start = minutesOfDay(item.session.startsAt);
      const end = Math.max(start + 20, minutesOfDay(item.session.endsAt));
      if (start >= clusterEnd) flush();
      const used = new Set(cluster.filter((block) => block.top + block.height > (start - START_HOUR * 60) * (HOUR_PX / 60)).map((b) => b.column));
      let column = 0;
      while (used.has(column)) column++;
      const block: IBlock = {
        item,
        top: (start - START_HOUR * 60) * (HOUR_PX / 60),
        height: Math.max(28, (end - start) * (HOUR_PX / 60) - 2),
        column,
        columns: 1
      };
      cluster.push(block);
      blocks.push(block);
      clusterEnd = Math.max(clusterEnd, end);
    }
    flush();
    return blocks;
  });

  /** Soft tinted surfaces by status, no side stripes; cancelled sessions are hatched. */
  protected tone(item: IMyProgrammeItem): string {
    if (item.session.status === 'CANCELLED') {
      return 'border-gray-200 text-gray-400 line-through bg-[repeating-linear-gradient(135deg,#f9fafb_0,#f9fafb_6px,#f3f4f6_6px,#f3f4f6_12px)]';
    }
    if (item.status === 'PENDING') return 'border-amber-200/70 bg-amber-50 text-amber-950';
    if (item.status === 'WAITLISTED') return 'border-violet-200/70 bg-violet-50 text-violet-950';
    if (item.status === 'DECLINED') return 'border-red-200/70 bg-red-50 text-red-900';
    return 'border-primary-200/70 bg-primary-50 text-primary-950';
  }

  protected dot(item: IMyProgrammeItem): string {
    if (item.session.status === 'CANCELLED') return 'bg-gray-300';
    if (item.status === 'PENDING') return 'bg-amber-500';
    if (item.status === 'WAITLISTED') return 'bg-violet-500';
    if (item.status === 'DECLINED') return 'bg-red-500';
    return 'bg-primary-500';
  }
}
