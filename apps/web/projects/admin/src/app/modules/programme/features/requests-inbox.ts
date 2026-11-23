import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Toast } from '@/app/core/toast';
import { festivalDayLabel, sessionRange } from '@/app/shared/helpers';
import { ProgrammeAdminApi } from '../data-access/programme-admin.api';
import { IRequestGroup } from '../interfaces/programme-admin.interface';

/** "Demandes": pending requests for sessions on approval, decided one by one or in bulk (PRD-002 §5.5). */
@Component({
  imports: [DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './requests-inbox.html'
})
export default class RequestsInbox implements OnInit {
  private readonly api = inject(ProgrammeAdminApi);
  private readonly toast = inject(Toast);

  protected readonly groups = signal<IRequestGroup[]>([]);
  protected readonly loading = signal(true);
  protected readonly selected = signal<string[]>([]);
  protected readonly declining = signal(false);
  protected readonly note = signal('');
  protected readonly busy = signal(false);

  protected readonly total = computed(() => this.groups().reduce((sum, group) => sum + group.requests.length, 0));
  protected readonly range = sessionRange;
  protected readonly dayLabel = festivalDayLabel;

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async reload(): Promise<void> {
    try {
      this.groups.set((await this.api.requests()).groups);
      this.selected.set([]);
    } catch (error) {
      this.toast.error((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected toggle(id: string): void {
    this.selected.update((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  protected toggleGroup(group: IRequestGroup): void {
    const ids = group.requests.map((request) => request.registrationId);
    const all = ids.every((id) => this.selected().includes(id));
    this.selected.update((current) => (all ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]));
  }

  protected groupChecked(group: IRequestGroup): boolean {
    return group.requests.every((request) => this.selected().includes(request.registrationId));
  }

  protected dayOf(iso: string): string {
    return festivalDayLabel(new Date(new Date(iso).getTime() + 3_600_000).toISOString().slice(0, 10));
  }

  protected async decide(decision: 'APPROVE' | 'DECLINE', ids = this.selected()): Promise<void> {
    if (!ids.length) return;
    this.busy.set(true);
    try {
      const result = await this.api.decide(ids, decision, decision === 'DECLINE' ? this.note() || undefined : undefined);
      const parts = [
        result.approved && `${result.approved} acceptée(s)`,
        result.waitlisted && `${result.waitlisted} en liste d'attente (complet)`,
        result.declined && `${result.declined} refusée(s)`
      ].filter(Boolean);
      this.toast.success(`${parts.join(', ')}. Les personnes sont prévenues.`);
      this.declining.set(false);
      this.note.set('');
      await this.reload();
    } catch (error) {
      this.toast.error((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
