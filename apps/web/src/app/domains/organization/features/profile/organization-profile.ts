import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Toast } from '@/app/core/toast';
import { ImageUpload } from '@/app/shared/ui/image-upload/image-upload';
import { IApiSuccess, IOrganizationProfile } from '@/app/shared/interfaces';
import { MarketplaceCatalogStore } from '@/app/shared/data-access';
import { OrganizationStore } from '../../data-access';

@Component({
  templateUrl: './organization-profile.html',
  providers: [OrganizationStore],
  imports: [
    FormField,
    ImageUpload,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ]
})
export default class OrganizationProfile implements OnInit {
  protected readonly store = inject(OrganizationStore);
  protected readonly catalogStore = inject(MarketplaceCatalogStore);
  private readonly toast = inject(Toast);

  protected readonly profileResource = httpResource<IApiSuccess<IOrganizationProfile>>(() => '/me/organization');

  protected readonly model = signal<IOrganizationProfile>({
    name: '',
    type: '',
    sector: '',
    city: '',
    contactName: '',
    contactTitle: '',
    phone: '',
    professionalEmail: ''
  });

  protected readonly profileForm = form(this.model, (schemaPath) => {
    required(schemaPath.name);
    required(schemaPath.type);
    required(schemaPath.sector);
    required(schemaPath.city);
    required(schemaPath.contactName);
    email(schemaPath.professionalEmail);
  });

  protected readonly initials = computed(() => {
    const parts = this.model().name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  });

  constructor() {
    effect(() => {
      if (this.profileResource.hasValue()) {
        const profile = this.profileResource.value().data;
        this.model.set({
          name: profile.name,
          type: profile.type,
          sector: profile.sector,
          city: profile.city,
          contactName: profile.contactName,
          contactTitle: profile.contactTitle,
          phone: profile.phone,
          professionalEmail: profile.professionalEmail
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
        this.profileResource.reload();
        this.toast.success('Profil mis à jour.');
      }
    });
  }

  ngOnInit(): void {
    this.catalogStore.load().subscribe();
  }

  protected saveProfile(): void {
    submit(this.profileForm, async () => {
      this.store.saveProfile(this.model());
    });
  }
}
