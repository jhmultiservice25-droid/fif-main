import { httpResource } from '@angular/common/http';
import { Component, effect, inject, input, OnInit, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { Toast } from '@/app/core/toast';
import { IApiSuccess, INeed, INeedPayload, INeedPayloadInput } from '@/app/shared/interfaces';
import { MarketplaceCatalogStore } from '@/app/shared/data-access';
import { Steps } from '@/app/shared/ui/steps/steps';
import { OrganizationStore } from '../../data-access';

interface INeedFormModel {
  status: 'DRAFT' | 'SUBMITTED';
  priorityChallenge: string;
  problemDomains: string[];
  solutionTypes: string[];
  priority: string;
  timeline: string;
  pilotWillingness: string;
  budgetBand: string;
  publicationConsent: 'NAMED' | 'ANONYMOUS' | 'NO' | 'DISCUSS';
  fikiriChallenge: string;
  digitizationLevel: string;
  challengeDescription: string;
  currentSituation: string;
  expectedImpact: string;
  successCriteria: string;
  stakeholders: string;
  constraints: string;
  additionalInfo: string;
}

type IConsent = INeedFormModel['publicationConsent'];

const CONSENT_HINTS: Record<IConsent, string> = {
  NAMED: 'Visible par les innovateurs, avec le nom de votre organisation.',
  ANONYMOUS: 'Visible par les innovateurs, sans le nom de votre organisation.',
  NO: 'Non publiée dans la marketplace.',
  DISCUSS: 'Non publiée pour l’instant, à convenir avec l’équipe FIF.'
};

const defaultNeedModel = (): INeedFormModel => ({
  status: 'DRAFT',
  priorityChallenge: '',
  problemDomains: [],
  solutionTypes: [],
  priority: '',
  timeline: '',
  pilotWillingness: '',
  budgetBand: '',
  publicationConsent: 'DISCUSS',
  fikiriChallenge: '',
  digitizationLevel: '',
  challengeDescription: '',
  currentSituation: '',
  expectedImpact: '',
  successCriteria: '',
  stakeholders: '',
  constraints: '',
  additionalInfo: ''
});

@Component({
  templateUrl: './need-form.html',
  providers: [OrganizationStore],
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    RouterLink,
    Steps
  ]
})
export default class NeedForm implements OnInit {
  readonly id = input<string | undefined>();

  protected readonly store = inject(OrganizationStore);
  protected readonly catalogStore = inject(MarketplaceCatalogStore);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  protected readonly steps = ['Le défi', 'Cadrage', 'Attentes et publication'];
  protected readonly step = signal(0);

  protected readonly needResource = httpResource<IApiSuccess<INeed>>(() => {
    const needId = this.id();
    return needId && needId !== 'nouveau' ? `/me/needs/${encodeURIComponent(needId)}` : undefined;
  });

  protected readonly model = signal<INeedFormModel>(defaultNeedModel());
  protected readonly needForm = form(this.model, (schemaPath) => {
    required(schemaPath.priorityChallenge);
  });

  protected readonly isNew = () => !this.id() || this.id() === 'nouveau';

  constructor() {
    effect(() => {
      if (this.needResource.hasValue()) {
        const need = this.needResource.value().data;
        this.model.set({
          status: need.status,
          priorityChallenge: need.priorityChallenge,
          problemDomains: [...need.problemDomains],
          solutionTypes: [...need.solutionTypes],
          priority: need.priority,
          timeline: need.timeline,
          pilotWillingness: need.pilotWillingness,
          budgetBand: need.budgetBand,
          publicationConsent: need.publicationConsent,
          fikiriChallenge: need.fikiriChallenge,
          digitizationLevel: need.payload?.digitizationLevel ?? '',
          challengeDescription: need.payload?.challengeDescription ?? '',
          currentSituation: need.payload?.currentSituation ?? '',
          expectedImpact: need.payload?.expectedImpact ?? '',
          successCriteria: need.payload?.successCriteria ?? '',
          stakeholders: need.payload?.stakeholders ?? '',
          constraints: need.payload?.constraints ?? '',
          additionalInfo: need.payload?.additionalInfo ?? ''
        });
      }
    });

    effect(() => {
      const message = this.store.error();
      if (message) {
        this.toast.error(message, 'Enregistrement impossible');
        this.store.clearError();
      }
    });

    let revision = 0;
    effect(() => {
      const currentRevision = this.store.revision();
      if (currentRevision > revision) {
        revision = currentRevision;
        this.toast.success(this.submitting ? 'Fiche soumise.' : 'Brouillon enregistré.');
        void this.router.navigate(['/organisation/fiches']);
      }
    });
  }

  private submitting = false;

  protected consentHint(value: string): string {
    return CONSENT_HINTS[value as IConsent] ?? '';
  }

  protected selectConsent(value: string): void {
    this.model.update((model) => ({ ...model, publicationConsent: value as IConsent }));
  }

  ngOnInit(): void {
    this.catalogStore.load().subscribe();
  }

  protected save(asSubmitted = false): void {
    submit(this.needForm, async () => {
      const value = this.model();
      this.submitting = asSubmitted;
      const payload: INeedPayload = {
        digitizationLevel: value.digitizationLevel || undefined,
        challengeDescription: value.challengeDescription || undefined,
        currentSituation: value.currentSituation || undefined,
        expectedImpact: value.expectedImpact || undefined,
        successCriteria: value.successCriteria || undefined,
        stakeholders: value.stakeholders || undefined,
        constraints: value.constraints || undefined,
        additionalInfo: value.additionalInfo || undefined
      };

      const body: INeedPayloadInput = {
        status: asSubmitted ? 'SUBMITTED' : value.status,
        priorityChallenge: value.priorityChallenge,
        problemDomains: value.problemDomains,
        solutionTypes: value.solutionTypes,
        priority: value.priority,
        timeline: value.timeline,
        pilotWillingness: value.pilotWillingness,
        budgetBand: value.budgetBand,
        publicationConsent: value.publicationConsent,
        fikiriChallenge: value.fikiriChallenge,
        payload
      };

      if (this.isNew()) {
        this.store.createNeed(body);
      } else {
        this.store.saveNeed({ id: this.id()!, payload: body });
      }
    });
  }
}
