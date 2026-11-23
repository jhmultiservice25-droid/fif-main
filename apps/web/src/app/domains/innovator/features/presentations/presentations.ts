import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { Toast } from '@/app/core/toast';
import { IApiError, IApiSuccess, IInnovatorShowcase, IPartnerMessage, IShowcaseSolutionChoice } from '@/app/shared/interfaces';

/** "Mes présentations": pick up to N of the selected solutions, at most M presenters each (PRD-003 §7.1). */
@Component({
  imports: [DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './presentations.html'
})
export default class Presentations implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(Toast);

  protected readonly data = signal<IInnovatorShowcase | null>(null);
  protected readonly messages = signal<IPartnerMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly sector = signal('');
  protected readonly onlyAvailable = signal(false);

  protected readonly settings = computed(() => this.data()?.settings ?? null);
  protected readonly picks = computed(() => this.data()?.picks ?? []);
  protected readonly limitReached = computed(() => {
    const settings = this.settings();
    return !!settings && this.picks().length >= settings.maxPerInnovator;
  });
  protected readonly freeSlots = computed(() =>
    Array.from({ length: Math.max(0, (this.settings()?.maxPerInnovator ?? 0) - this.picks().length) }, (_, index) => index)
  );
  protected readonly seats = computed(() => Array.from({ length: this.settings()?.maxPerSolution ?? 0 }, (_, index) => index));
  protected readonly solutions = computed(() => {
    const term = this.search().trim().toLowerCase();
    return (this.data()?.solutions ?? []).filter((solution) => {
      if (this.sector() && solution.sector !== this.sector()) return false;
      if (this.onlyAvailable() && solution.placesLeft === 0 && !solution.mine) return false;
      return !term || `${solution.name} ${solution.summary} ${solution.reference} ${solution.city}`.toLowerCase().includes(term);
    });
  });

  async ngOnInit(): Promise<void> {
    await this.reload();
    try {
      const { data } = await firstValueFrom(this.http.get<IApiSuccess<IPartnerMessage[]>>('/me/contact-messages'));
      this.messages.set(data);
    } catch {
      this.messages.set([]);
    }
  }

  protected async reload(): Promise<void> {
    try {
      const { data } = await firstValueFrom(this.http.get<IApiSuccess<IInnovatorShowcase>>('/me/showcase'));
      this.data.set(data);
    } catch (error) {
      this.toast.error(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async pick(solution: IShowcaseSolutionChoice): Promise<void> {
    await this.act(solution.id, async () => {
      const { data } = await firstValueFrom(
        this.http.post<IApiSuccess<IInnovatorShowcase>>(`/me/showcase/${solution.id}`, { listedPublicly: true })
      );
      this.data.set(data);
      this.toast.success(`Vous présenterez « ${solution.name} ».`);
    });
  }

  protected async release(solutionId: string, name: string): Promise<void> {
    await this.act(solutionId, async () => {
      const { data } = await firstValueFrom(this.http.delete<IApiSuccess<IInnovatorShowcase>>(`/me/showcase/${solutionId}`));
      this.data.set(data);
      this.toast.success(`« ${name} » libérée.`);
    });
  }

  protected async toggleListing(solutionId: string, listedPublicly: boolean): Promise<void> {
    await this.act(solutionId, async () => {
      const { data } = await firstValueFrom(
        this.http.patch<IApiSuccess<IInnovatorShowcase>>(`/me/showcase/${solutionId}`, { listedPublicly })
      );
      this.data.set(data);
    });
  }

  private async act(id: string, action: () => Promise<void>): Promise<void> {
    this.busyId.set(id);
    try {
      await action();
    } catch (error) {
      this.toast.error(this.message(error));
      await this.reload(); // a lost race: show the up-to-date places
    } finally {
      this.busyId.set(null);
    }
  }

  private message(error: unknown): string {
    return ((error as HttpErrorResponse).error as IApiError | undefined)?.message ?? 'Action impossible pour le moment.';
  }
}
