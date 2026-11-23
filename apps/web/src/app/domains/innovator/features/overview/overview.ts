import { httpResource } from '@angular/common/http';
import { Component, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { IApiSuccess, IInnovatorProfile, IMyEventPass, IProject } from '@/app/shared/interfaces';

@Component({
  templateUrl: './overview.html',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, RouterLink]
})
export default class InnovatorOverview {
  protected readonly profileResource = httpResource<IApiSuccess<IInnovatorProfile>>(() => '/me/innovator');
  protected readonly projectsResource = httpResource<IApiSuccess<IProject[]>>(() => '/me/projects');
  protected readonly passResource = httpResource<IApiSuccess<IMyEventPass>>(() => '/me/event-pass');
  protected readonly profile = computed(() => this.profileResource.value()?.data ?? null);
  protected readonly projects = computed(() => this.projectsResource.value()?.data ?? []);
  protected readonly submittedCount = computed(
    () => this.projects().filter((project) => project.status === 'SUBMITTED').length
  );

  protected readonly recent = computed(() => this.projects().slice(0, 5));

  private readonly profileChecklist = computed((): [string, string | null | undefined][] => {
    const profile = this.profile();
    if (!profile) return [];
    return [
      ['Nom d’affichage', profile.displayName],
      ['Ville', profile.city],
      ['Téléphone', profile.phone],
      ['Photo de profil', profile.photoUrl]
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
