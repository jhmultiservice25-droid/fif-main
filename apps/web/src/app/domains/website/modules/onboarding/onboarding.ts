import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Toast } from '@/app/core/toast';
import { AuthStore } from '@/app/domains/auth/data-access/auth.store';
import { MarketplaceCatalogStore } from '@/app/shared/data-access';
import { IApiError, IApiSuccess } from '@/app/shared/interfaces';

type IProfile = 'INNOVATOR' | 'ORGANIZATION';
type IStep = 'email' | 'profile';

const COPY: Record<IProfile, { eyebrow: string; title: string; lead: string; icon: string; tone: string; home: string }> = {
  INNOVATOR: {
    eyebrow: 'Innovateur',
    title: 'Présentez votre solution au FIF 2026',
    lead: 'Choisissez les solutions que vous présenterez au festival et soumettez vos projets aux partenaires.',
    icon: 'lightbulb',
    tone: 'bg-amber-50 text-amber-700',
    home: '/innovateur/projets/nouveau'
  },
  ORGANIZATION: {
    eyebrow: 'Organisation',
    title: 'Publiez un besoin, rencontrez les innovateurs',
    lead: 'Décrivez un défi de votre organisation pour recevoir des solutions adaptées.',
    icon: 'building-2',
    tone: 'bg-emerald-50 text-emerald-700',
    home: '/organisation/fiches/nouveau'
  }
};

/** /rejoindre/innovateur and /rejoindre/organisation: create a new account by e-mail, then open its session. Existing accounts must use the sign-in flow. */
@Component({
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, RouterLink],
  templateUrl: './onboarding.html'
})
export default class Onboarding implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);
  private readonly authStore = inject(AuthStore);
  protected readonly catalog = inject(MarketplaceCatalogStore);
  protected readonly profile = inject(ActivatedRoute).snapshot.data['profile'] as IProfile;
  protected readonly copy = COPY[this.profile];

  protected readonly step = signal<IStep>('email');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly emailModel = signal({ email: '' });
  protected readonly emailForm = form(this.emailModel, (path) => {
    required(path.email);
    email(path.email);
  });

  protected readonly innovatorModel = signal({ displayName: '', organization: '', city: '', phone: '' });
  protected readonly innovatorForm = form(this.innovatorModel, (path) => {
    required(path.displayName);
    required(path.city);
    required(path.phone);
  });

  protected readonly organizationModel = signal({
    name: '',
    type: '',
    sector: '',
    city: '',
    contactName: '',
    contactTitle: '',
    phone: ''
  });
  protected readonly organizationForm = form(this.organizationModel, (path) => {
    required(path.name);
    required(path.type);
    required(path.sector);
    required(path.city);
    required(path.contactName);
    required(path.phone);
  });

  protected readonly stepNumber = computed(() => ({ email: 1, profile: 2 })[this.step()]);

  ngOnInit(): void {
    this.catalog.load().subscribe();
    const role = this.authStore.user()?.role;
    if (role === this.profile) void this.router.navigateByUrl(this.authStore.homeRoute());
  }

  protected async continueWithEmail(): Promise<void> {
    if (this.emailForm().invalid()) return;
    await this.run(async () => {
      const { data } = await firstValueFrom(
        this.http.post<
          IApiSuccess<{
            user: { id: string; email: string; name: string; role: string };
            isNewAccount: boolean;
            existingProfile: string;
          }>
        >('/participant-auth/onboarding', {
          email: this.emailModel().email,
          profile: this.profile
        })
      );
      await firstValueFrom(this.authStore.initialize());
      if (data.isNewAccount && data.user.role === this.profile) {
        this.step.set('profile');
        return;
      }
      this.toast.success('Bon retour ! Votre espace est ouvert.');
      const target =
        this.profile === 'INNOVATOR' && this.authStore.user()?.role === 'INNOVATOR'
          ? '/innovateur/projets/nouveau'
          : this.authStore.homeRoute();
      void this.router.navigateByUrl(target);
    });
  }

  protected async saveProfile(): Promise<void> {
    const isInnovator = this.profile === 'INNOVATOR';
    if (isInnovator ? this.innovatorForm().invalid() : this.organizationForm().invalid()) return;
    await this.run(async () => {
      if (isInnovator) {
        const value = this.innovatorModel();
        await firstValueFrom(
          this.http.patch('/me/innovator', { ...value, organization: value.organization.trim() || undefined, email: this.emailModel().email })
        );
      } else {
        await firstValueFrom(
          this.http.patch('/me/organization', { ...this.organizationModel(), professionalEmail: this.emailModel().email })
        );
      }
      this.toast.success('Votre espace est prêt.');
      void this.router.navigateByUrl(this.copy.home);
    });
  }

  private async run(action: () => Promise<void>, onError?: () => void): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (error) {
      const apiError = (error as HttpErrorResponse).error as IApiError | undefined;
      this.error.set(apiError?.message ?? 'Une erreur est survenue. Réessayez.');
      onError?.();
    } finally {
      this.busy.set(false);
    }
  }
}
