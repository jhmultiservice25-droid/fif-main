import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { Toast } from '@/app/core/toast';
import { FestivalStore } from '@/app/shared/data-access';
import { IAdminListPage, IAdminParticipantListItem, IApiSuccess } from '@/app/shared/interfaces';
import { ParticipantsAdminStore } from '../../data-access';

@Component({
  templateUrl: './participant-list.html',
  providers: [ParticipantsAdminStore],
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatPaginatorModule, MatTableModule]
})
export default class ParticipantList {
  protected readonly festivalDays = inject(FestivalStore).days;
  protected readonly store = inject(ParticipantsAdminStore);
  private readonly toast = inject(Toast);

  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly displayedColumns = ['participant', 'whatsapp', 'days', 'email', 'createdAt', 'actions'];

  protected readonly participantsResource = httpResource<IApiSuccess<IAdminListPage<IAdminParticipantListItem>>>(
    () => `/admin/participants?page=${this.page()}&pageSize=${this.pageSize()}`
  );

  protected readonly participants = computed(() =>
    this.participantsResource.hasValue() ? this.participantsResource.value().data.items : []
  );
  protected readonly total = computed(() =>
    this.participantsResource.hasValue() ? this.participantsResource.value().data.total : 0
  );
  protected readonly pendingOnPage = computed(() => this.participants().filter((row) => !row.emailSentAt).length);

  constructor() {
    let revision = 0;
    effect(() => {
      if (this.store.revision() > revision) {
        revision = this.store.revision();
        this.participantsResource.reload();
        if (this.store.lastEmailSent()) {
          this.toast.success('E-mail envoyé.');
        } else {
          this.toast.error("L'e-mail n'est pas parti — vérifiez que RESEND_API_KEY est configurée.", 'E-mail non envoyé');
        }
      }
    });

    effect(() => {
      const message = this.store.error();
      if (message) {
        this.toast.error(message, 'Envoi impossible');
        this.store.clearError();
      }
    });
  }

  protected changePage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
  }

  protected dayLabel(dayId: string): string {
    const index = this.festivalDays().findIndex((day) => day.date === dayId);
    return index === -1 ? dayId : `J${index + 1}`;
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-CD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }
}
