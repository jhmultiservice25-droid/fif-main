import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Toast } from '@/app/core/toast';
import { Analytics } from '@/app/core/analytics';
import { FestivalStore } from '@/app/shared/data-access';
import { AuthStore } from '@/app/domains/auth/data-access/auth.store';
import { IApiError, IApiSuccess, IMyEventPass, IParticipantProfile } from '@/app/shared/interfaces';
import MyProgramme from '../my-programme/my-programme';
import { RegistrationLauncher } from '../registration-launcher';

/** /mon-espace — connexion par e-mail + code et espace participant. */
@Component({
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MyProgramme, RouterLink],
  templateUrl: './space.html'
})
export default class Space {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);
  private readonly launcher = inject(RegistrationLauncher);
  protected readonly authStore = inject(AuthStore);
  protected readonly festival = inject(FestivalStore).info;
  protected readonly analytics = inject(Analytics);

  protected readonly isParticipant = computed(() => this.authStore.user()?.role === 'PARTICIPANT');
  protected readonly authMode = signal<'choice' | 'login' | 'signup'>('choice');

  // Connexion sans code : l'adresse e-mail suffit (décision équipe FIF, 02/11/2026).
  protected readonly loginModel = signal({ email: '' });
  protected readonly loginForm = form(this.loginModel, (path) => {
    required(path.email);
    email(path.email);
  });
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly unknownEmail = signal(false);

  protected readonly profileResource = httpResource<IApiSuccess<IParticipantProfile>>(() =>
    this.isParticipant() ? '/me/participant' : undefined
  );
  protected readonly passResource = httpResource<IApiSuccess<IMyEventPass>>(() =>
    this.isParticipant() ? '/me/event-pass' : undefined
  );
  protected readonly editing = signal(false);
  protected readonly profileModel = signal({ city: '', whatsapp: '' });
  protected readonly profileForm = form(this.profileModel, (path) => {
    required(path.city);
    required(path.whatsapp);
  });

  constructor() {
    const role = this.authStore.user()?.role;
    if (role === 'INNOVATOR' || role === 'ORGANIZATION') {
      void this.router.navigateByUrl(this.authStore.homeRoute());
    }
  }

  protected chooseLogin(): void {
    this.authMode.set('login');
    this.unknownEmail.set(false);
    this.error.set('');
  }

  protected chooseSignup(): void {
    this.authMode.set('signup');
    this.unknownEmail.set(false);
    this.error.set('');
  }

  protected backToAuthChoices(): void {
    this.authMode.set('choice');
    this.unknownEmail.set(false);
    this.error.set('');
  }

  protected async signIn(): Promise<void> {
    if (this.loginForm().invalid() || this.busy()) return;
    this.unknownEmail.set(false);
    await this.run(async () => {
      await firstValueFrom(this.http.post('/participant-auth/access', this.loginModel()));
      await firstValueFrom(this.authStore.initialize());
      const role = this.authStore.user()?.role;
      if (role === 'INNOVATOR' || role === 'ORGANIZATION') {
        void this.router.navigateByUrl(this.authStore.homeRoute());
      } else if (this.router.url.startsWith('/connexion')) {
        void this.router.navigateByUrl('/mon-espace');
      }
    });
  }

  protected participate(): void {
    void this.launcher.open();
  }

  protected startEdit(profile: IParticipantProfile): void {
    this.profileModel.set({ city: profile.city, whatsapp: profile.whatsapp });
    this.editing.set(true);
  }

  protected async saveProfile(): Promise<void> {
    if (this.profileForm().invalid()) return;
    await this.run(async () => {
      await firstValueFrom(this.http.patch('/me/participant', this.profileModel()));
      this.editing.set(false);
      this.profileResource.reload();
      this.toast.success('Coordonnées mises à jour.');
    });
  }

  protected readonly confirmUpgrade = signal(false);
  protected readonly confirmOrganization = signal(false);

  protected async becomeOrganization(): Promise<void> {
    if (!this.confirmOrganization()) {
      this.confirmOrganization.set(true);
      return;
    }
    await this.run(async () => {
      await firstValueFrom(this.http.post('/me/participant/become-organization', {}));
      await firstValueFrom(this.authStore.initialize());
      this.toast.success('Votre espace organisation est prêt.');
      void this.router.navigateByUrl('/organisation/profil');
    });
  }

  protected async becomeInnovator(): Promise<void> {
    if (!this.confirmUpgrade()) {
      this.confirmUpgrade.set(true);
      return;
    }
    await this.run(async () => {
      await firstValueFrom(this.http.post('/me/participant/become-innovator', {}));
      await firstValueFrom(this.authStore.initialize());
      this.toast.success('Votre espace innovateur est prêt.');
      void this.router.navigateByUrl('/innovateur/projets/nouveau');
    });
  }

  protected signOut(): void {
    this.authStore.signOut();
  }

  private async run(action: () => Promise<void>, onError?: () => void): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (error) {
      const apiError = (error as HttpErrorResponse).error as IApiError | undefined;
      if (apiError?.code === 'UNKNOWN_EMAIL') {
        this.unknownEmail.set(true);
        this.authMode.set('signup');
      } else {
        this.error.set(apiError?.message ?? 'Une erreur est survenue. Réessayez.');
      }
      onError?.();
    } finally {
      this.busy.set(false);
    }
  }
}
