import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, computed, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Analytics } from './analytics';

/**
 * Privacy sheet. On a first visit it slides up over the page and asks for a decision; the choice is
 * reopenable afterwards from the floating cookie button, so measurement can be switched off later.
 *
 * Refusing is a single click, exactly like accepting — the sheet asks only about the measurement
 * cookie, since anonymous measurement runs either way (see Analytics).
 */
@Component({
  selector: 'consent-banner',
  imports: [MatIconModule],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-60 bg-gray-950/40" (click)="close()" aria-hidden="true"></div>

      <div
        class="fixed inset-x-0 bottom-0 z-61 flex justify-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title">
        <div
          class="sheet-up w-full max-w-2xl rounded-t-3xl border border-gray-200 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
          <div class="flex items-start gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-700">
              <mat-icon class="size-5" svgIcon="cookie" />
            </span>
            <div class="min-w-0 flex-auto">
              <h2 id="consent-title" class="font-semibold text-gray-950">Votre vie privée</h2>
              <p class="mt-1 text-sm text-gray-600">
                Nous mesurons l’audience du site pour l’améliorer. Jamais de publicité, aucun partage à des
                tiers, aucune donnée revendue.
              </p>
            </div>
            @if (!blocking()) {
              <button
                type="button"
                class="-m-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-gray-500 transition hover:bg-gray-100"
                aria-label="Fermer"
                (click)="close()">
                <mat-icon class="size-4" svgIcon="x" />
              </button>
            }
          </div>

          <ul class="mt-5 space-y-2">
            <li class="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
              <mat-icon class="size-4 shrink-0 text-gray-500" svgIcon="lock" />
              <div class="min-w-0 flex-auto">
                <p class="text-sm font-medium text-gray-950">Strictement nécessaire</p>
                <p class="text-xs text-gray-500">Connexion, formulaires, sécurité.</p>
              </div>
              <span class="shrink-0 text-xs font-semibold text-gray-500">Toujours actif</span>
            </li>

            <li class="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
              <mat-icon class="size-4 shrink-0 text-gray-500" svgIcon="chart-no-axes-combined" />
              <div class="min-w-0 flex-auto">
                <p class="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-950">
                  Mesure d’audience
                  <span class="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                    Recommandé
                  </span>
                </p>
                <p class="text-xs text-gray-500">Pages vues et parcours d’inscription, de façon anonyme.</p>
              </div>
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="analyticsOn()"
                aria-label="Mesure d’audience"
                class="relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition"
                [class]="analyticsOn() ? 'bg-primary-700' : 'bg-gray-300'"
                (click)="analyticsOn.set(!analyticsOn())">
                <span
                  class="absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]"
                  [class]="analyticsOn() ? 'left-[22px]' : 'left-0.5'"></span>
              </button>
            </li>
          </ul>

          <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="h-11 cursor-pointer rounded-full border border-gray-300 px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              (click)="refuseAll()">
              Refuser tout
            </button>
            <button
              type="button"
              class="h-11 cursor-pointer rounded-full bg-primary-700 px-6 text-sm font-semibold text-white transition hover:bg-primary-800"
              (click)="save()">
              Enregistrer mes choix
            </button>
          </div>
        </div>
      </div>
    } @else if (decided()) {
      <button
        type="button"
        class="fixed bottom-5 left-5 z-50 grid size-11 cursor-pointer place-items-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-[0_8px_24px_-8px_rgb(4_19_31/0.35)] transition hover:text-primary-700"
        aria-label="Préférences de confidentialité"
        title="Préférences de confidentialité"
        (click)="reopen()">
        <mat-icon class="size-5" svgIcon="cookie" />
      </button>
    }
  `,
  styles: `
    .sheet-up {
      animation: consent-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes consent-up {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .sheet-up {
        animation: none;
      }
    }
  `
})
export class ConsentBanner {
  protected readonly analytics = inject(Analytics);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Pre-selected: this is the recommended choice, and refusing stays one click away. */
  protected readonly analyticsOn = signal(true);
  private readonly manualOpen = signal(false);

  /** No decision yet, so the page waits for one. */
  protected readonly blocking = computed(() => this.analytics.shouldAsk);
  protected readonly open = computed(() => this.blocking() || this.manualOpen());
  /** A choice exists, so the floating button can offer to change it. */
  protected readonly decided = computed(() => !!this.analytics.measurementId && this.analytics.consent() !== null);

  constructor() {
    effect((onCleanup) => {
      if (!this.isBrowser || !this.blocking()) return;
      const body = this.document.body;
      const previous = body.style.overflow;
      body.style.overflow = 'hidden';
      onCleanup(() => {
        body.style.overflow = previous;
      });
    });
  }

  protected reopen(): void {
    this.analyticsOn.set(this.analytics.consent() === 'granted');
    this.manualOpen.set(true);
  }

  /** The backdrop and the cross only dismiss a sheet that was reopened by the visitor. */
  protected close(): void {
    if (!this.blocking()) this.manualOpen.set(false);
  }

  protected save(): void {
    if (this.analyticsOn()) this.analytics.accept();
    else this.analytics.decline();
    this.manualOpen.set(false);
  }

  protected refuseAll(): void {
    this.analyticsOn.set(false);
    this.analytics.decline();
    this.manualOpen.set(false);
  }
}
