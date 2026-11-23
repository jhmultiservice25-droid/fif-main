import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Toast } from '@/app/core/toast';
import { ProgrammeAdminApi } from '../data-access/programme-admin.api';
import { IRoom } from '../interfaces/programme-admin.interface';

const PALETTE = ['#006da4', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4b5563'];

/** Rooms ("salles") used as columns of the programme grid (PRD-002 §5.6). */
@Component({
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './rooms.html'
})
export default class Rooms implements OnInit {
  private readonly api = inject(ProgrammeAdminApi);
  private readonly toast = inject(Toast);

  protected readonly rooms = signal<IRoom[]>([]);
  protected readonly editing = signal<Partial<IRoom> & { name: string } | null>(null);
  protected readonly busy = signal(false);
  protected readonly palette = PALETTE;

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async reload(): Promise<void> {
    try {
      this.rooms.set(await this.api.rooms());
    } catch (error) {
      this.toast.error((error as Error).message);
    }
  }

  protected add(): void {
    this.editing.set({ name: '', capacity: null, color: PALETTE[this.rooms().length % PALETTE.length], order: this.rooms().length });
  }

  protected edit(room: IRoom): void {
    this.editing.set({ ...room });
  }

  protected patch(changes: Partial<IRoom>): void {
    this.editing.update((room) => (room ? { ...room, ...changes } : room));
  }

  protected async save(): Promise<void> {
    const room = this.editing();
    if (!room?.name.trim()) return;
    await this.run(async () => {
      await this.api.saveRoom({ ...room, name: room.name.trim() });
      this.editing.set(null);
      this.toast.success('Salle enregistrée.');
    });
  }

  protected async remove(room: IRoom): Promise<void> {
    await this.run(async () => {
      await this.api.removeRoom(room.id);
      this.toast.success('Salle supprimée.');
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      await this.reload();
    } catch (error) {
      this.toast.error((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
