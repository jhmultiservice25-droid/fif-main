import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { RegistrationLauncher } from '../programme/registration-launcher';

/** /rejoindre — three clear ways in, one account each (PRD-003 §5). */
@Component({
  imports: [MatIconModule, RouterLink],
  template: `
    <div class="min-h-dvh bg-gray-50 pt-28 pb-16">
      <div class="mx-auto max-w-5xl px-5 sm:px-8">
        <p class="text-sm font-semibold tracking-[0.2em] text-primary-700 uppercase">FIF 2026 · Kinshasa</p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">Comment souhaitez-vous participer ?</h1>
        <p class="mt-2 text-gray-600">Un seul compte par adresse e-mail, sans mot de passe : un code vous est envoyé.</p>

        <div class="mt-10 grid gap-4 md:grid-cols-3">
          <button type="button" class="group flex cursor-pointer flex-col rounded-3xl border border-gray-200 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg" (click)="participate()">
            <span class="flex size-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700"><mat-icon svgIcon="ticket" /></span>
            <span class="mt-5 text-lg font-semibold text-gray-950">Je participe</span>
            <span class="mt-1 flex-auto text-sm text-gray-600">Plénières, masterclasses, rencontres : choisissez vos sessions et recevez votre badge.</span>
            <span class="mt-5 text-sm font-semibold text-primary-700 group-hover:underline">Choisir mes sessions →</span>
          </button>
          <a routerLink="/rejoindre/innovateur" class="group flex flex-col rounded-3xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg">
            <span class="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><mat-icon svgIcon="lightbulb" /></span>
            <span class="mt-5 text-lg font-semibold text-gray-950">Je présente une solution</span>
            <span class="mt-1 flex-auto text-sm text-gray-600">Innovateur : présentez des solutions au festival et soumettez vos projets aux partenaires.</span>
            <span class="mt-5 text-sm font-semibold text-primary-700 group-hover:underline">Créer mon espace innovateur →</span>
          </a>
          <a routerLink="/rejoindre/organisation" class="group flex flex-col rounded-3xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg">
            <span class="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><mat-icon svgIcon="building-2" /></span>
            <span class="mt-5 text-lg font-semibold text-gray-950">Je représente une organisation</span>
            <span class="mt-1 flex-auto text-sm text-gray-600">Institution, entreprise, ONG : publiez un besoin et rencontrez les innovateurs.</span>
            <span class="mt-5 text-sm font-semibold text-primary-700 group-hover:underline">Créer mon espace organisation →</span>
          </a>
        </div>

        <p class="mt-8 text-sm text-gray-600">
          Déjà inscrit(e) ? <a routerLink="/connexion" class="font-semibold text-primary-700 hover:underline">Se connecter</a>
          · Bailleur ou partenaire ? <a routerLink="/projets" class="font-semibold text-primary-700 hover:underline">Parcourir les solutions</a>
        </p>
      </div>
    </div>
  `
})
export default class JoinChoice {
  private readonly launcher = inject(RegistrationLauncher);

  protected participate(): void {
    void this.launcher.open();
  }
}
