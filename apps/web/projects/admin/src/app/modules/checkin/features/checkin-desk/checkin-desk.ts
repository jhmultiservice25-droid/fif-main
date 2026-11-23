import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Toast } from '@/app/core/toast';
import { IApiSuccess, IEventPass, IEventPassKind } from '@/app/shared/interfaces';
import { CheckInStore } from '../../data-access';

const KIND_LABELS: Record<IEventPassKind, string> = {
  COMMITTEE: "Comité d'organisation",
  VOLUNTEER: 'Volontaire',
  INNOVATOR: 'Innovateur',
  ORGANIZATION: 'Organisation',
  PARTICIPANT: 'Participant'
};

interface IScanModel {
  token: string;
}

@Component({
  templateUrl: './checkin-desk.html',
  providers: [CheckInStore],
  imports: [
    DatePipe,
    FormField,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ]
})
export default class CheckInDesk {
  /** Populated from ?code=… so scanning a badge's QR (which links here) auto-runs the lookup. */
  readonly code = input<string | undefined>();

  protected readonly store = inject(CheckInStore);
  private readonly toast = inject(Toast);
  private readonly tokenInput = viewChild<ElementRef<HTMLInputElement>>('tokenInput');

  protected readonly model = signal<IScanModel>({ token: '' });
  protected readonly scanForm = form(this.model);

  protected readonly recentResource = httpResource<IApiSuccess<IEventPass[]>>(() => '/admin/checkin');

  protected kindLabel(kind: IEventPassKind): string {
    return KIND_LABELS[kind] ?? kind;
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  }

  constructor() {
    effect(() => {
      const message = this.store.error();
      if (message) {
        this.toast.error(message, 'Code invalide');
      }
    });

    let revision = 0;
    effect(() => {
      if (this.store.revision() > revision) {
        revision = this.store.revision();
        this.recentResource.reload();
        const current = this.store.current();
        if (current) {
          this.toast.success(`${current.fullName} enregistré(e).`);
        }
        this.model.set({ token: '' });
        this.store.reset();
        this.tokenInput()?.nativeElement.focus();
      }
    });

    effect(() => {
      const sent = this.store.lastEmailSent();
      if (sent === null) return;
      if (sent) {
        this.toast.success('E-mail envoyé.');
      } else {
        this.toast.error("Échec de l'envoi — vérifiez que RESEND_API_KEY est configurée.", 'E-mail non envoyé');
      }
    });

    let autoLookedUp = false;
    effect(() => {
      const code = this.code();
      if (!code || autoLookedUp) return;
      autoLookedUp = true;
      const token = extractToken(code);
      this.model.set({ token });
      this.store.lookup(token);
    });
  }

  protected lookup(): void {
    const token = extractToken(this.model().token.trim());
    if (!token) return;
    this.model.set({ token });
    this.store.lookup(token);
  }

  protected confirm(): void {
    const token = this.model().token.trim();
    if (!token) return;
    this.store.confirm(token);
  }

  protected resendEmail(): void {
    const token = this.model().token.trim();
    if (!token) return;
    this.store.resendEmail(token);
  }
}

/** Accepts either a bare token or a full scanned check-in URL (?code=…) and returns just the token. */
function extractToken(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/[?&]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : trimmed;
}
