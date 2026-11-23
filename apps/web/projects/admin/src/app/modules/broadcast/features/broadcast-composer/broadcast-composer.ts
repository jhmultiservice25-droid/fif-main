import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Toast } from '@/app/core/toast';
import { IApiSuccess, IBroadcastAudience, IBroadcastAudienceId } from '@/app/shared/interfaces';
import { BroadcastStore } from '../../data-access';

const AUDIENCE_ICONS: Record<IBroadcastAudienceId, string> = {
  PARTICIPANT: 'ticket',
  SPEAKER: 'mic',
  COMMITTEE: 'briefcase-business',
  VOLUNTEER: 'users',
  INNOVATOR: 'lightbulb',
  ORGANIZATION: 'building-2'
};

interface IBroadcastFormModel {
  subject: string;
  body: string;
}

@Component({
  templateUrl: './broadcast-composer.html',
  providers: [BroadcastStore],
  imports: [FormField, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule]
})
export default class BroadcastComposer {
  protected readonly store = inject(BroadcastStore);
  private readonly toast = inject(Toast);

  protected readonly audiencesResource = httpResource<IApiSuccess<IBroadcastAudience[]>>(
    () => '/admin/broadcast/audiences'
  );
  protected readonly audiences = computed(() => this.audiencesResource.value()?.data ?? []);

  protected readonly selected = signal<IBroadcastAudienceId[]>([]);
  protected readonly isConfirming = signal(false);

  protected readonly model = signal<IBroadcastFormModel>({ subject: '', body: '' });
  protected readonly broadcastForm = form(this.model, (schemaPath) => {
    required(schemaPath.subject);
    minLength(schemaPath.subject, 3);
    required(schemaPath.body);
    minLength(schemaPath.body, 10);
  });

  /** Upper bound: someone in two selected audiences is only emailed once. */
  protected readonly recipientCount = computed(() =>
    this.audiences()
      .filter((audience) => this.selected().includes(audience.id))
      .reduce((sum, audience) => sum + audience.count, 0)
  );

  protected readonly canSend = computed(
    () => this.recipientCount() > 0 && this.broadcastForm().valid() && !this.store.isSending()
  );

  constructor() {
    effect(() => {
      const result = this.store.result();
      if (!result) return;
      this.isConfirming.set(false);
      if (result.sent === 0) {
        this.toast.error(
          "Aucun e-mail n'est parti — vérifiez que RESEND_API_KEY est configurée sur le serveur.",
          'Envoi impossible'
        );
      } else if (result.failed > 0) {
        this.toast.error(`${result.sent} envoyé(s), ${result.failed} en échec.`, 'Envoi partiel');
      } else {
        this.toast.success(`Message envoyé à ${result.sent} destinataire(s).`);
        this.model.set({ subject: '', body: '' });
        this.selected.set([]);
      }
      this.store.clear();
    });

    effect(() => {
      const message = this.store.error();
      if (message) {
        this.isConfirming.set(false);
        this.toast.error(message, 'Envoi impossible');
        this.store.clear();
      }
    });
  }

  protected icon(id: IBroadcastAudienceId): string {
    return AUDIENCE_ICONS[id];
  }

  protected isSelected(id: IBroadcastAudienceId): boolean {
    return this.selected().includes(id);
  }

  protected toggle(id: IBroadcastAudienceId): void {
    this.isConfirming.set(false);
    this.selected.update((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  protected askConfirmation(): void {
    submit(this.broadcastForm, async () => {
      if (this.recipientCount() > 0) this.isConfirming.set(true);
    });
  }

  protected send(): void {
    const { subject, body } = this.model();
    this.store.send({ audiences: this.selected(), subject: subject.trim(), body: body.trim() });
  }
}
