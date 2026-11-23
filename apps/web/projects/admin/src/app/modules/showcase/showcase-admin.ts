import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { Toast } from '@/app/core/toast';
import { IApiError, IApiSuccess } from '@/app/shared/interfaces';
import { IAdminSession, IProgrammeOverview } from '../programme/interfaces/programme-admin.interface';
import { IAdminShowcase, IAdminShowcaseSettings, IAdminSolution, IImportPreview } from './showcase.types';

type IFilter = 'all' | 'uncovered' | 'full' | 'inactive';

/** Console › Solutions FIF: import, coverage, presenters and picker settings (PRD-003 §7.2). */
@Component({
  imports: [DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './showcase-admin.html'
})
export default class ShowcaseAdmin implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(Toast);

  protected readonly data = signal<IAdminShowcase | null>(null);
  protected readonly sessions = signal<IAdminSession[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly filter = signal<IFilter>('all');
  protected readonly search = signal('');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly preview = signal<IImportPreview | null>(null);
  protected readonly deactivateMissing = signal(false);
  protected readonly settingsOpen = signal(false);
  protected readonly settingsDraft = signal<IAdminShowcaseSettings | null>(null);
  protected readonly addEmail = signal('');
  protected readonly override = signal(false);

  protected readonly selected = computed(() => this.data()?.solutions.find((row) => row.id === this.selectedId()) ?? null);
  protected readonly rows = computed(() => {
    const data = this.data();
    if (!data) return [];
    const term = this.search().trim().toLowerCase();
    return data.solutions.filter((solution) => {
      if (this.filter() === 'inactive') {
        if (solution.active) return false;
      } else if (!solution.active) {
        return false;
      }
      if (this.filter() === 'uncovered' && solution.presenters.length) return false;
      if (this.filter() === 'full' && solution.presenters.length < data.settings.maxPerSolution) return false;
      return (
        !term ||
        `${solution.reference} ${solution.name} ${solution.sector} ${solution.presenters.map((p) => p.name + ' ' + p.email).join(' ')}`
          .toLowerCase()
          .includes(term)
      );
    });
  });
  protected readonly coveragePercent = computed(() => {
    const coverage = this.data()?.coverage;
    return coverage?.active ? Math.round((coverage.covered / coverage.active) * 100) : 0;
  });
  protected readonly moveTargets = computed(() =>
    (this.data()?.solutions ?? []).filter((solution) => solution.active && solution.id !== this.selectedId())
  );

  async ngOnInit(): Promise<void> {
    await this.reload();
    try {
      const { data } = await firstValueFrom(this.http.get<IApiSuccess<IProgrammeOverview>>('/admin/programme'));
      this.sessions.set(data.sessions.filter((session) => session.status !== 'CANCELLED'));
    } catch {
      this.sessions.set([]);
    }
  }

  protected async reload(): Promise<void> {
    try {
      const { data } = await firstValueFrom(this.http.get<IApiSuccess<IAdminShowcase>>('/admin/showcase'));
      this.data.set(data);
    } catch (error) {
      this.toast.error(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  // --- Import ---------------------------------------------------------------------

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    await this.run(async () => {
      const { data } = await firstValueFrom(this.http.post<IApiSuccess<IImportPreview>>('/admin/showcase/import', body));
      this.preview.set(data);
      this.deactivateMissing.set(false);
    });
  }

  protected async confirmImport(): Promise<void> {
    const preview = this.preview();
    if (!preview) return;
    await this.run(async () => {
      const { data } = await firstValueFrom(
        this.http.post<IApiSuccess<{ created: number; updated: number; deactivated: number }>>(
          `/admin/showcase/import/${preview.token}/confirm`,
          { deactivateMissing: this.deactivateMissing() }
        )
      );
      this.preview.set(null);
      this.toast.success(`${data.created} créée(s), ${data.updated} mise(s) à jour, ${data.deactivated} désactivée(s).`);
      await this.reload();
    });
  }

  protected async download(path: string, filename: string): Promise<void> {
    await this.run(async () => {
      const file = await firstValueFrom(this.http.get(path, { responseType: 'blob' }));
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  // --- Settings -------------------------------------------------------------------

  protected openSettings(): void {
    const settings = this.data()?.settings;
    if (!settings) return;
    this.settingsDraft.set({ ...settings, demoShowSessionIds: [...settings.demoShowSessionIds] });
    this.settingsOpen.set(true);
  }

  protected patchSettings(changes: Partial<IAdminShowcaseSettings>): void {
    this.settingsDraft.update((draft) => (draft ? { ...draft, ...changes } : draft));
  }

  protected toggleSession(id: string): void {
    const draft = this.settingsDraft();
    if (!draft) return;
    const ids = draft.demoShowSessionIds.includes(id)
      ? draft.demoShowSessionIds.filter((item) => item !== id)
      : [...draft.demoShowSessionIds, id];
    this.patchSettings({ demoShowSessionIds: ids });
  }

  /** Formats the deadline for the datetime-local input, in Kinshasa time (UTC+1). */
  protected localDeadline(value: string | null): string {
    if (!value) return '';
    return new Date(new Date(value).getTime() + 3_600_000).toISOString().slice(0, 16);
  }

  protected setDeadline(value: string): void {
    this.patchSettings({ deadline: value ? new Date(`${value}:00+01:00`).toISOString() : null });
  }

  protected async saveSettings(): Promise<void> {
    const draft = this.settingsDraft();
    if (!draft) return;
    await this.run(async () => {
      await firstValueFrom(this.http.put('/admin/showcase/settings', draft));
      this.settingsOpen.set(false);
      this.toast.success('Réglages enregistrés.');
      await this.reload();
    });
  }

  protected readonly demoShowLabel = computed(() => {
    const ids = this.data()?.settings.demoShowSessionIds ?? [];
    if (!ids.length) return 'non configurée';
    return ids.map((id) => this.sessions().find((session) => session.id === id)?.title ?? 'session supprimée').join(', ');
  });

  protected emptySeats(solution: IAdminSolution, max: number): number[] {
    return Array.from({ length: Math.max(0, max - solution.presenters.length) }, (_, index) => index);
  }

  protected presenterNames(solution: IAdminSolution): string {
    return solution.presenters.length ? solution.presenters.map((presenter) => presenter.name).join(', ') : 'Aucun présentateur';
  }

  protected previewReferences(preview: IImportPreview): string {
    const refs = preview.deactivate.slice(0, 3).map((row) => row.reference).join(', ');
    return preview.deactivate.length > 3 ? `${refs}…` : refs;
  }

  // --- Presenters -----------------------------------------------------------------

  protected async addPresenter(solution: IAdminSolution): Promise<void> {
    const email = this.addEmail().trim();
    if (!email) return;
    await this.mutate(`/admin/showcase/solutions/${solution.id}/presenters`, 'post', { email, overrideLimits: this.override() });
    this.addEmail.set('');
  }

  protected async removePresenter(solution: IAdminSolution, userId: string): Promise<void> {
    await this.mutate(`/admin/showcase/solutions/${solution.id}/presenters/${userId}`, 'delete');
  }

  protected async movePresenter(solution: IAdminSolution, userId: string, toSolutionId: string): Promise<void> {
    if (!toSolutionId) return;
    await this.mutate(`/admin/showcase/solutions/${solution.id}/presenters/${userId}/move`, 'post', {
      toSolutionId,
      overrideLimits: this.override()
    });
  }

  private async mutate(url: string, method: 'post' | 'delete', body?: object): Promise<void> {
    await this.run(async () => {
      const request =
        method === 'post'
          ? this.http.post<IApiSuccess<IAdminShowcase>>(url, body)
          : this.http.delete<IApiSuccess<IAdminShowcase>>(url);
      const { data } = await firstValueFrom(request);
      this.data.set(data);
      this.toast.success('Modification enregistrée, innovateur(s) prévenu(s) par e-mail.');
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (error) {
      this.toast.error(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }

  private message(error: unknown): string {
    return ((error as HttpErrorResponse).error as IApiError | undefined)?.message ?? 'Action impossible pour le moment.';
  }
}
