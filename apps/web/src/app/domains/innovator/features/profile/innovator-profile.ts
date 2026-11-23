import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Toast } from '@/app/core/toast';
import { ImageUpload } from '@/app/shared/ui/image-upload/image-upload';
import { IApiSuccess, IInnovatorProfile } from '@/app/shared/interfaces';
import { InnovatorStore } from '../../data-access';

@Component({
  templateUrl: './innovator-profile.html',
  providers: [InnovatorStore],
  imports: [FormField, ImageUpload, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule]
})
export default class InnovatorProfile {
  protected readonly store = inject(InnovatorStore);
  private readonly toast = inject(Toast);

  protected readonly profileResource = httpResource<IApiSuccess<IInnovatorProfile>>(() => '/me/innovator');

  protected readonly model = signal({
    displayName: '',
    organization: '',
    city: '',
    phone: '',
    email: ''
  });

  protected readonly profileForm = form(this.model, (schemaPath) => {
    required(schemaPath.displayName);
    required(schemaPath.city);
    email(schemaPath.email);
  });

  protected readonly initials = computed(() => {
    const name = this.model().displayName.trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name[0]!.toUpperCase();
  });

  constructor() {
    effect(() => {
      if (this.profileResource.hasValue()) {
        const profile = this.profileResource.value().data;
        this.model.set({
          displayName: profile.displayName,
          organization: profile.organization ?? '',
          city: profile.city,
          phone: profile.phone,
          email: profile.email
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
      if (this.store.revision() > revision) {
        revision = this.store.revision();
        this.profileResource.reload();
        this.toast.success('Votre profil a été mis à jour.');
      }
    });
  }

  protected saveProfile(): void {
    submit(this.profileForm, async () => {
      const value = this.model();
      this.store.saveProfile({
        ...value,
        organization: value.organization.trim() ? value.organization.trim() : null
      });
    });
  }
}
