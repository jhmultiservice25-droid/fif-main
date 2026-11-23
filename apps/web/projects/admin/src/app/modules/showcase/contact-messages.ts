import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IApiSuccess } from '@/app/shared/interfaces';
import { IContactMessageRow } from './showcase.types';

const SENDER_TYPES: Record<string, string> = {
  DONOR: 'Bailleur',
  INSTITUTION: 'Institution',
  COMPANY: 'Entreprise',
  PARTNER: 'Partenaire',
  OTHER: 'Autre'
};

/** Console › Mises en relation: every partner message relayed to an owner (PRD-003 §6.3). */
@Component({
  imports: [DatePipe, MatIconModule],
  template: `
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <h1 class="text-3xl font-semibold tracking-tight">Mises en relation</h1>
      <p class="mt-1 text-neutral-500">Messages envoyés aux porteurs depuis le catalogue public.</p>
      <ul class="mt-6 space-y-3">
        @for (row of resource.value()?.data?.items ?? []; track row.id) {
          <li class="rounded-2xl border border-gray-200 bg-white p-4">
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="font-semibold text-gray-950">{{ row.senderName }}</span>
              @if (row.senderOrganization) {
                <span class="text-gray-500">· {{ row.senderOrganization }}</span>
              }
              <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{{ types[row.senderType] ?? row.senderType }}</span>
              <mat-icon class="size-4 text-gray-400" svgIcon="arrow-right" />
              <span class="font-medium text-primary-800">{{ row.targetName }}</span>
              <span class="ml-auto text-xs text-gray-500">{{ row.createdAt | date: 'dd/MM HH:mm' }}</span>
            </div>
            <p class="mt-2 text-sm whitespace-pre-line text-gray-700">{{ row.message }}</p>
            <p class="mt-2 text-xs" [class]="row.deliveredAt ? 'text-emerald-700' : 'text-amber-700'">
              {{ row.deliveredAt ? 'Transmis à ' + row.recipientEmail : 'Non transmis (e-mail indisponible)' }} · réponse à {{ row.senderEmail }}
            </p>
          </li>
        } @empty {
          <li class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center text-sm text-gray-500">
            Aucun message pour le moment.
          </li>
        }
      </ul>
    </div>
  `
})
export default class ContactMessages {
  protected readonly page = signal(1);
  protected readonly types = SENDER_TYPES;
  protected readonly resource = httpResource<IApiSuccess<{ items: IContactMessageRow[]; total: number }>>(
    () => `/admin/contact-messages?page=${this.page()}`
  );
}
