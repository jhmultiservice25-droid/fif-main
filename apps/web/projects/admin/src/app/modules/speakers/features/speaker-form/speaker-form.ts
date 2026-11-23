import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { Toast } from '@/app/core/toast';
import { apiAssetUrl } from '@/app/shared/helpers';
import { FestivalStore } from '@/app/shared/data-access';
import { IApiSuccess, ISpeaker } from '@/app/shared/interfaces';
import { SpeakersAdminStore } from '../../data-access';

interface ISpeakerFormModel {
  name: string;
  title: string;
  bio: string;
  email: string;
}

@Component({
  templateUrl: './speaker-form.html',
  providers: [SpeakersAdminStore],
  imports: [
    FormField,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ]
})
export default class SpeakerForm {
  readonly id = input<string | undefined>();

  protected readonly store = inject(SpeakersAdminStore);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  protected readonly days = inject(FestivalStore).days;
  protected readonly isNew = () => !this.id() || this.id() === 'nouveau';

  protected readonly speakerResource = httpResource<IApiSuccess<ISpeaker[]>>(() => '/admin/speakers');
  protected readonly currentSpeaker = () => {
    const id = this.id();
    return this.speakerResource.value()?.data.find((speaker) => speaker.id === id) ?? null;
  };

  protected readonly model = signal<ISpeakerFormModel>({ name: '', title: '', bio: '', email: '' });
  protected readonly speakerForm = form(this.model, (schemaPath) => {
    required(schemaPath.name);
    email(schemaPath.email);
  });

  protected readonly selectedDays = signal<string[]>([]);
  protected readonly selectedPhoto = signal<File | null>(null);
  protected readonly photoPreviewUrl = signal<string | null>(null);

  protected readonly displayPhotoUrl = computed(
    () => this.photoPreviewUrl() ?? apiAssetUrl(this.currentSpeaker()?.photoUrl)
  );

  protected readonly initials = computed(() => {
    const name = this.model().name.trim();
    if (!name) return '';
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  });

  constructor() {
    effect(() => {
      const speaker = this.currentSpeaker();
      if (speaker) {
        this.model.set({ name: speaker.name, title: speaker.title, bio: speaker.bio, email: speaker.email ?? '' });
        this.selectedDays.set(speaker.days);
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
      if (this.store.revision() > revision) {
        revision = this.store.revision();
        if (this.isNew()) {
          this.toast.success('Intervenant créé.');
          void this.router.navigate(['/speakers']);
        } else {
          this.speakerResource.reload();
          this.photoPreviewUrl.set(null);
          this.selectedPhoto.set(null);
          this.toast.success('Intervenant mis à jour.');
        }
      }
    });
  }

  protected dayChecked(dayId: string): boolean {
    return this.selectedDays().includes(dayId);
  }

  protected toggleDay(dayId: string): void {
    this.selectedDays.update((days) => (days.includes(dayId) ? days.filter((id) => id !== dayId) : [...days, dayId]));
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.photoPreviewUrl.set(URL.createObjectURL(file));

    const id = this.id();
    if (this.isNew() || !id) {
      this.selectedPhoto.set(file);
      return;
    }
    this.store.uploadPhoto({ id, file });
  }

  protected save(): void {
    submit(this.speakerForm, async () => {
      const value = this.model();
      const payload = { ...value, days: this.selectedDays() };
      if (this.isNew()) {
        this.store.create({ payload, photo: this.selectedPhoto() });
      } else {
        this.store.update({ id: this.id()!, payload });
      }
    });
  }
}
