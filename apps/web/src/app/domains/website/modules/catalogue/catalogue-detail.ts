import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { email, form, FormField, minLength, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Analytics } from '@/app/core/analytics';
import { IApiError, IApiSuccess, ICatalogueProject, ICatalogueSolution } from '@/app/shared/interfaces';

const SENDER_TYPES = [
  { value: 'DONOR', label: 'Bailleur' },
  { value: 'INSTITUTION', label: 'Institution' },
  { value: 'COMPANY', label: 'Entreprise' },
  { value: 'PARTNER', label: 'Partenaire' },
  { value: 'OTHER', label: 'Autre' }
];

/** Solution or project page with the relayed contact form (PRD-003 §6.2–6.3). */
@Component({
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, RouterLink],
  templateUrl: './catalogue-detail.html'
})
export default class CatalogueDetail {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly analytics = inject(Analytics);
  protected readonly kind = this.route.snapshot.data['kind'] as 'SOLUTION' | 'PROJECT';
  private readonly key = this.route.snapshot.paramMap.get(this.kind === 'SOLUTION' ? 'reference' : 'id') ?? '';

  protected readonly solutionResource = httpResource<IApiSuccess<ICatalogueSolution>>(() =>
    this.kind === 'SOLUTION' ? `/catalogue/solutions/${encodeURIComponent(this.key)}` : undefined
  );
  protected readonly projectResource = httpResource<IApiSuccess<ICatalogueProject>>(() =>
    this.kind === 'PROJECT' ? `/catalogue/projects/${encodeURIComponent(this.key)}` : undefined
  );
  protected readonly solution = computed(() => (this.solutionResource.hasValue() ? this.solutionResource.value().data : null));
  protected readonly project = computed(() => (this.projectResource.hasValue() ? this.projectResource.value().data : null));
  protected readonly notFound = computed(() =>
    this.kind === 'SOLUTION' ? !!this.solutionResource.error() : !!this.projectResource.error()
  );
  protected readonly title = computed(() => this.solution()?.name ?? this.project()?.title ?? '');

  protected readonly senderTypes = SENDER_TYPES;
  protected readonly contactOpen = signal(false);
  protected readonly sent = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly consent = signal(false);
  protected readonly model = signal({ senderName: '', senderOrganization: '', senderType: 'PARTNER', senderEmail: '', message: '', website: '' });
  protected readonly contactForm = form(this.model, (path) => {
    required(path.senderName);
    required(path.senderEmail);
    email(path.senderEmail);
    required(path.message);
    minLength(path.message, 20);
  });

  protected async send(): Promise<void> {
    if (this.contactForm().invalid() || !this.consent()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.http.post<IApiSuccess<{ sent: boolean }>>('/catalogue/contact', {
          ...this.model(),
          targetType: this.kind,
          targetId: this.key
        })
      );
      this.analytics.track('solution_contacted', { target: this.kind });
      this.sent.set(true);
    } catch (error) {
      const apiError = (error as HttpErrorResponse).error as IApiError | undefined;
      this.error.set(apiError?.message ?? 'Le message n’a pas pu être envoyé.');
    } finally {
      this.busy.set(false);
    }
  }
}
