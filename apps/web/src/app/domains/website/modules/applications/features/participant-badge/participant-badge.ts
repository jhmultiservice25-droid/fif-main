import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { FestivalStore } from '@/app/shared/data-access';
import { IApiSuccess, IParticipantBadge } from '@/app/shared/interfaces';

@Component({
  templateUrl: './participant-badge.html',
  imports: [DatePipe, MatButtonModule, RouterLink]
})
export class ParticipantBadge {
  private readonly http = inject(HttpClient);
  protected readonly festival = inject(FestivalStore).info;
  protected readonly badge = signal<IParticipantBadge | null>(null);
  protected readonly error = signal('');
  protected readonly isLoading = signal(false);

  protected generate(): void {
    const id = window.localStorage.getItem('fif.participant.id');
    if (!id) {
      this.error.set('Aucune inscription participant n’a été trouvée sur cet appareil.');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');
    this.http.post<IApiSuccess<IParticipantBadge>>(`/applications/participant/${encodeURIComponent(id)}/badge`, {}).subscribe({
      next: (response) => {
        this.badge.set(response.data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.error.set(error?.error?.message ?? 'La génération du badge est impossible.');
        this.isLoading.set(false);
      }
    });
  }

  protected printBadge(): void {
    window.print();
  }
}
