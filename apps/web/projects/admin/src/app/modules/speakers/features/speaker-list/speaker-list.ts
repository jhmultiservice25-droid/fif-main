import { httpResource } from '@angular/common/http';
import { Component, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { apiAssetUrl } from '@/app/shared/helpers';
import { FestivalStore } from '@/app/shared/data-access';
import { IApiSuccess, ISpeaker } from '@/app/shared/interfaces';
import { Toast } from '@/app/core/toast';
import { SpeakersAdminStore } from '../../data-access';

@Component({
  templateUrl: './speaker-list.html',
  providers: [SpeakersAdminStore],
  imports: [MatButtonModule, MatCardModule, MatIconModule, RouterLink]
})
export default class SpeakerList {
  protected readonly festivalDays = inject(FestivalStore).days;
  protected readonly assetUrl = apiAssetUrl;
  protected readonly store = inject(SpeakersAdminStore);
  private readonly toast = inject(Toast);
  protected readonly speakersResource = httpResource<IApiSuccess<ISpeaker[]>>(() => '/admin/speakers');

  constructor() {
    effect(() => {
      if (this.store.revision() > 0) {
        this.speakersResource.reload();
      }
    });

    effect(() => {
      const message = this.store.error();
      if (message) {
        this.toast.error(message);
        this.store.clearError();
      }
    });
  }

  protected dayLabel(dayId: string): string {
    const index = this.festivalDays().findIndex((day) => day.date === dayId);
    return index === -1 ? dayId : `J${index + 1}`;
  }

  protected remove(speaker: ISpeaker): void {
    if (confirm(`Supprimer ${speaker.name} ?`)) {
      this.store.remove(speaker.id);
      this.toast.success('Intervenant supprimé.');
    }
  }
}
