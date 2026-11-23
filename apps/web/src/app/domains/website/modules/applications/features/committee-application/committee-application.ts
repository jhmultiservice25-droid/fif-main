import { httpResource } from '@angular/common/http';
import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import {
  disabled,
  email,
  form,
  FormField,
  maxDate,
  minLength,
  required,
  submit,
  validate
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { IApiSuccess, ICommitteeApplicationInput, IPoleWithJobs } from '@/app/shared/interfaces';
import { Message } from '@/app/shared/ui/app-message/app-message';
import { ApplicationStore } from '../../data-access';
import { createEmptyDate, toIsoDate } from '../../helpers/application-date';
import { SEX_OPTIONS } from '@/app/shared/data/application-options';
import { countWords } from '../../helpers/application-validators';
import { ICommitteeApplicationForm } from '../../interfaces';
import { ApplicationHero } from '../../ui/application-hero/application-hero';

@Component({
  templateUrl: './committee-application.html',
  providers: [ApplicationStore],
  imports: [
    FormField,
    RouterLink,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    Message,
    ApplicationHero
  ]
})
export class CommitteeApplication {
  protected readonly store = inject(ApplicationStore);
  protected readonly polesResource = httpResource<IApiSuccess<IPoleWithJobs[]>>(() => '/poles');
  protected readonly poles = computed(() => this.polesResource.value()?.data ?? []);
  protected readonly sexOptions = SEX_OPTIONS;
  protected readonly today = new Date();

  protected readonly applicationModel = signal<ICommitteeApplicationForm>({
    identity: {
      lastName: '',
      postnom: '',
      firstName: '',
      sex: '',
      birthDate: createEmptyDate(),
      city: '',
      whatsapp: '',
      email: ''
    },
    primaryJobId: '',
    secondaryJobId: '',
    motivation: ''
  });

  protected readonly selectedPrimaryJobTitle = computed(() => {
    const id = this.applicationModel().primaryJobId;
    for (const pole of this.poles()) {
      const job = pole.jobs.find((item) => item.id === id);
      if (job) return job.title;
    }
    return '';
  });

  protected readonly applicationForm = form(this.applicationModel, (schemaPath) => {
    disabled(schemaPath, { when: () => this.store.isAlreadyApplied() });

    required(schemaPath.identity.lastName);
    required(schemaPath.identity.postnom);
    required(schemaPath.identity.firstName);
    required(schemaPath.identity.sex);
    validate(schemaPath.identity.birthDate, ({ value }) =>
      Number.isNaN(value().getTime())
        ? { kind: 'required', message: 'La date de naissance est obligatoire.' }
        : undefined
    );
    maxDate(schemaPath.identity.birthDate, this.today);
    required(schemaPath.identity.city);
    required(schemaPath.identity.whatsapp);
    minLength(schemaPath.identity.whatsapp, 8);
    required(schemaPath.identity.email);
    email(schemaPath.identity.email);

    required(schemaPath.primaryJobId);
    validate(schemaPath.secondaryJobId, ({ value, valueOf }) =>
      value() && value() === valueOf(schemaPath.primaryJobId)
        ? { kind: 'sameChoice', message: 'Choisissez deux postes différents.' }
        : undefined
    );

    required(schemaPath.motivation);
    minLength(schemaPath.motivation, 10);
    validate(schemaPath.motivation, ({ value }) =>
      countWords(value()) > 150 ? { kind: 'maxWords', message: 'La motivation ne peut pas dépasser 150 mots.' } : undefined
    );
  });

  constructor() {
    afterNextRender(() => this.store.initialize('COMMITTEE'));
  }

  protected onBirthDateSelected(date: Date | null): void {
    if (!date) return;

    this.applicationModel.update((model) => ({
      ...model,
      identity: { ...model.identity, birthDate: date }
    }));
    this.applicationForm.identity.birthDate().markAsTouched();
  }

  protected selectSex(value: ICommitteeApplicationForm['identity']['sex']): void {
    this.applicationForm.identity.sex().value.set(value);
    this.applicationForm.identity.sex().markAsTouched();
  }

  protected selectPrimaryJob(value: string): void {
    this.applicationForm.primaryJobId().value.set(value);
    this.applicationForm.primaryJobId().markAsTouched();
  }

  protected selectSecondaryJob(value: string): void {
    this.applicationForm.secondaryJobId().value.set(value);
    this.applicationForm.secondaryJobId().markAsTouched();
  }

  protected onSubmit(): void {
    submit(this.applicationForm, async (formState) => {
      const { identity, primaryJobId, secondaryJobId, motivation } = formState().value();

      this.store.submitCommittee({
        ...identity,
        birthDate: toIsoDate(identity.birthDate),
        sex: identity.sex as ICommitteeApplicationInput['sex'],
        primaryJobId,
        secondaryJobId: secondaryJobId || undefined,
        motivation
      });
    });
  }
}
