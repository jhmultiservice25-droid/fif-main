import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { sessionRange } from '@/app/shared/helpers';
import { IAdminSession, IRoom } from '../interfaces/programme-admin.interface';
import { SESSION_TYPE_LABELS } from '@/app/shared/helpers';
import { CANCELLED_CARD, kinshasaMinutes, typeStyle } from './session-style';

export const GRID_START = 8 * 60;
export const GRID_END = 23 * 60;
const SLOT = 15;
const PX_PER_MIN = 64 / 60;
const LANE_MIN_PX = 132;
const COLUMN_MIN_PX = 200;

export interface IGridMove {
  session: IAdminSession;
  roomId: string | null;
  startMinutes: number;
  endMinutes: number;
}

export interface IGridCreate {
  roomId: string | null;
  startMinutes: number;
}

interface IColumn {
  id: string | null;
  name: string;
  color: string;
  lanes: number;
  width: number;
  left: number;
}

interface ICard {
  session: IAdminSession;
  column: number;
  lane: number;
  lanes: number;
  top: number;
  height: number;
}

interface IGesture {
  mode: 'move' | 'resize';
  session: IAdminSession;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

const snap = (minutes: number) => Math.round(minutes / SLOT) * SLOT;

/**
 * Day × room time grid (ADR-004). Mouse/pen: drag a card to move it (time and room), drag its bottom edge to
 * resize, click to edit, click an empty slot to create. Touch: tap to edit — the editor covers every change.
 */
@Component({
  selector: 'schedule-grid',
  imports: [MatIconModule],
  templateUrl: './schedule-grid.html',
  host: { class: 'block' }
})
export class ScheduleGrid {
  readonly sessions = input.required<IAdminSession[]>();
  readonly rooms = input.required<IRoom[]>();
  readonly selectedId = input<string | null>(null);

  readonly open = output<IAdminSession>();
  readonly create = output<IGridCreate>();
  readonly move = output<IGridMove>();

  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');

  protected readonly hours = Array.from({ length: (GRID_END - GRID_START) / 60 }, (_, index) => GRID_START / 60 + index);
  protected readonly hourPx = 60 * PX_PER_MIN;
  protected readonly gridHeight = (GRID_END - GRID_START) * PX_PER_MIN;
  protected readonly range = sessionRange;
  protected readonly style = typeStyle;
  protected readonly cancelled = CANCELLED_CARD;
  protected readonly typeLabels = SESSION_TYPE_LABELS;

  /** Live preview of the card being dragged or resized. */
  protected readonly preview = signal<{ id: string; column: number; top: number; height: number } | null>(null);
  private gesture: IGesture | null = null;

  protected readonly layout = computed(() => {
    const rooms = this.rooms();
    const sessions = this.sessions();
    const columnKeys: (string | null)[] = [...rooms.map((room) => room.id)];
    if (sessions.some((session) => !session.roomId) || !rooms.length) columnKeys.push(null);

    const cards: ICard[] = [];
    const lanesPerColumn = columnKeys.map((key, column) => {
      const inColumn = sessions
        .filter((session) => (session.roomId ?? null) === key)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.endsAt.localeCompare(b.endsAt));
      let cluster: ICard[] = [];
      let clusterEnd = -1;
      let maxLanes = 1;
      const flush = () => {
        const lanes = Math.max(1, ...cluster.map((card) => card.lane + 1));
        cluster.forEach((card) => (card.lanes = lanes));
        maxLanes = Math.max(maxLanes, lanes);
        cluster = [];
      };
      for (const session of inColumn) {
        const start = kinshasaMinutes(session.startsAt);
        const end = Math.max(start + SLOT, kinshasaMinutes(session.endsAt));
        if (start >= clusterEnd) flush();
        const busy = new Set(
          cluster.filter((card) => kinshasaMinutes(card.session.endsAt) > start).map((card) => card.lane)
        );
        let lane = 0;
        while (busy.has(lane)) lane++;
        const card: ICard = {
          session,
          column,
          lane,
          lanes: 1,
          top: (start - GRID_START) * PX_PER_MIN,
          height: Math.max(22, (end - start) * PX_PER_MIN - 2)
        };
        cluster.push(card);
        cards.push(card);
        clusterEnd = Math.max(clusterEnd, end);
      }
      flush();
      return maxLanes;
    });

    let left = 0;
    const columns: IColumn[] = columnKeys.map((key, index) => {
      const room = rooms.find((item) => item.id === key);
      const width = Math.max(COLUMN_MIN_PX, lanesPerColumn[index]! * LANE_MIN_PX);
      const column = {
        id: key,
        name: room?.name ?? 'Sans salle',
        color: room?.color ?? '#9ca3af',
        lanes: lanesPerColumn[index]!,
        width,
        left
      };
      left += width;
      return column;
    });
    return { columns, cards, width: left };
  });

  protected cardStyle(card: ICard) {
    const column = this.layout().columns[card.column]!;
    const preview = this.preview();
    if (preview?.id === card.session.id) {
      const target = this.layout().columns[preview.column]!;
      return { top: preview.top, height: preview.height, left: target.left + 4, width: target.width - 8 };
    }
    const laneWidth = column.width / card.lanes;
    return { top: card.top, height: card.height, left: column.left + card.lane * laneWidth + 3, width: laneWidth - 6 };
  }

  protected isBlocking(session: IAdminSession): boolean {
    return session.conflicts.some((conflict) => conflict.severity === 'blocking');
  }

  // --- Gestures --------------------------------------------------------------

  protected onPointerDown(event: PointerEvent, session: IAdminSession, mode: 'move' | 'resize'): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (event.pointerType === 'touch' || session.status === 'CANCELLED') {
      return; // handled as a click
    }
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.gesture = { mode, session, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
  }

  protected onPointerMove(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
    gesture.moved = true;

    const card = this.layout().cards.find((item) => item.session.id === gesture.session.id)!;
    const start = kinshasaMinutes(gesture.session.startsAt);
    const end = kinshasaMinutes(gesture.session.endsAt);
    if (gesture.mode === 'resize') {
      const newEnd = Math.min(GRID_END, Math.max(start + SLOT, snap(end + dy / PX_PER_MIN)));
      this.preview.set({ id: card.session.id, column: card.column, top: card.top, height: (newEnd - start) * PX_PER_MIN - 2 });
      return;
    }
    const duration = end - start;
    const newStart = Math.min(GRID_END - duration, Math.max(GRID_START, snap(start + dy / PX_PER_MIN)));
    this.preview.set({
      id: card.session.id,
      column: this.columnAt(event.clientX) ?? card.column,
      top: (newStart - GRID_START) * PX_PER_MIN,
      height: duration * PX_PER_MIN - 2
    });
  }

  protected onPointerUp(event: PointerEvent, session: IAdminSession): void {
    const gesture = this.gesture;
    this.gesture = null;
    const preview = this.preview();
    this.preview.set(null);
    if (!gesture || !gesture.moved || !preview) {
      this.open.emit(session);
      return;
    }
    event.stopPropagation();
    const startMinutes = GRID_START + Math.round(preview.top / PX_PER_MIN);
    const endMinutes = startMinutes + Math.round((preview.height + 2) / PX_PER_MIN);
    const roomId = this.layout().columns[preview.column]!.id;
    const unchanged =
      startMinutes === kinshasaMinutes(session.startsAt) &&
      endMinutes === kinshasaMinutes(session.endsAt) &&
      roomId === (session.roomId ?? null);
    if (!unchanged) this.move.emit({ session, roomId, startMinutes, endMinutes });
  }

  protected onPointerCancel(): void {
    this.gesture = null;
    this.preview.set(null);
  }

  protected onEmptyClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) return;
    const rect = this.body().nativeElement.getBoundingClientRect();
    const minutes = GRID_START + snap((event.clientY - rect.top) / PX_PER_MIN - SLOT);
    const column = this.columnAt(event.clientX);
    if (column === null) return;
    this.create.emit({
      roomId: this.layout().columns[column]!.id,
      startMinutes: Math.min(GRID_END - 60, Math.max(GRID_START, minutes))
    });
  }

  /** Keyboard path to creation (the toolbar's "Nouvelle session" does the same). */
  protected onKeyboardCreate(event: Event): void {
    if (event.target !== event.currentTarget) return;
    this.create.emit({ roomId: this.layout().columns[0]?.id ?? null, startMinutes: 10 * 60 });
  }

  private columnAt(clientX: number): number | null {
    const rect = this.body().nativeElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const index = this.layout().columns.findIndex((column) => x >= column.left && x < column.left + column.width);
    return index === -1 ? null : index;
  }
}
