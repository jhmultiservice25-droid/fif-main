import { httpResource } from '@angular/common/http';
import { Component, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { IApiSuccess, IMyEventPass, INeed, IOrganizationProfile } from '@/app/shared/interfaces';

@Component({
  templateUrl: './overview.html',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, RouterLink]
})
export default class OrganizationOverview {
  protected readonly profileResource = httpResource<IApiSuccess<IOrganizationProfile>>(() => '/me/organization');
  protected readonly needsResource = httpResource<IApiSuccess<INeed[]>>(() => '/me/needs');
  protected readonly passResource = httpResource<IApiSuccess<IMyEventPass>>(() => '/me/event-pass');
  protected readonly profile = computed(() => this.profileResource.value()?.data ?? null);
  protected readonly needs = computed(() => this.needsResource.value()?.data ?? []);
  protected readonly submittedCount = computed(
    () => this.needs().filter((need) => need.status === 'SUBMITTED').length
  );

  protected readonly recent = computed(() => this.needs().slice(0, 5));

  private readonly profileChecklist = computed((): [string, string | null | undefined][] => {
    const profile = this.profile();
    if (!profile) return [];
    return [
      ['Nom de l’organisation', profile.name],
      ['Ville', profile.city],
      ['Téléphone', profile.phone],
      ['Nom du contact', profile.contactName],
      ['Logo', profile.logoUrl]
    ];
  });
  protected readonly missingFields = computed(() =>
    this.profileChecklist()
      .filter(([, value]) => !value)
      .map(([label]) => label)
  );
  protected readonly completion = computed(() => {
    const total = this.profileChecklist().length;
    return total ? Math.round(((total - this.missingFields().length) / total) * 100) : 0;
  });

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-CD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }
}
