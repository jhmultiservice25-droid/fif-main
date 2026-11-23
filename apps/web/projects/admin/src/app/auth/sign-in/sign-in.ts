import { HttpClient } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '@/app/domains/auth/data-access/auth.store';
import { ISignInPayload, ISignInResponse } from '@/app/domains/auth/interfaces';
import { environment } from '@/environments/environment';
import { FestivalChrome } from '../../core/festival';

@Component({
  templateUrl: './sign-in.html',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule]
})
export default class AdminSignIn {
  /** Deep link to return to after sign-in (e.g. a scanned check-in URL). */
  readonly redirect = input<string | undefined>();

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);

  protected readonly chrome = inject(FestivalChrome);
  protected readonly festivalLabel = this.chrome.label;
  protected readonly status = this.chrome.status;
  protected readonly websiteUrl = environment.websiteUrl;

  protected readonly model = signal<ISignInPayload>({ email: '', password: '' });
  protected readonly signInForm = form(this.model, (schemaPath) => {
    required(schemaPath.email);
    email(schemaPath.email);
    required(schemaPath.password);
  });
  protected readonly hidePassword = signal(true);
  protected readonly isLoading = signal(false);
  protected readonly error = signal('');

  protected signIn(): void {
    submit(this.signInForm, async () => {
      this.isLoading.set(true);
      this.error.set('');
      try {
        const { user } = await firstValueFrom(
          this.http.post<ISignInResponse>('/api/auth/sign-in/email', { ...this.model(), rememberMe: false })
        );
        if (user.role !== 'ADMIN') {
          // A valid participant account must not keep a session opened from the console.
          await firstValueFrom(this.http.post('/api/auth/sign-out', {})).catch(() => null);
          this.error.set('Ce compte n’a pas accès à la console d’administration.');
          return;
        }
        this.authStore.setUser({ id: user.id, email: user.email, name: user.name, role: 'ADMIN' });
        const target = this.redirect();
        await this.router.navigateByUrl(target?.startsWith('/') && !target.startsWith('//') ? target : '/');
      } catch {
        this.error.set('Adresse e-mail ou mot de passe incorrect.');
      } finally {
        this.isLoading.set(false);
      }
    });
  }
}
