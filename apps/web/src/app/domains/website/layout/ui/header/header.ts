import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Analytics } from '@/app/core/analytics';
import { AuthStore } from '@/app/domains/auth/data-access/auth.store';
import { RegistrationLauncher } from '../../../modules/programme/registration-launcher';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { NAVIGATION_GROUPS, NAVIGATION_LINKS } from '../../data/navigation';
import { INavigationLink } from '../../interfaces/navigation.interface';

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatIcon, MatMenuModule, NgTemplateOutlet, RouterLink, RouterLinkActive],
  host: {
    '(window:scroll)': 'updateScrolledState()'
  },
  templateUrl: './header.html'
})
export class Header {
  private readonly router = inject(Router);
  private readonly launcher = inject(RegistrationLauncher);
  protected readonly authStore = inject(AuthStore);
  private readonly analytics = inject(Analytics);

  protected isScrolled = signal(false);
  protected isMenuOpen = signal(false);

  protected links = NAVIGATION_LINKS;
  protected groups = NAVIGATION_GROUPS;

  /** Hides guest-only entries (Connexion) once signed in; "Se déconnecter" is shown instead. */
  protected visible(items: readonly INavigationLink[]): readonly INavigationLink[] {
    return this.authStore.user() ? items.filter((item) => !item.guestOnly) : items;
  }

  /** False only for routes that opt out via `data: { hasHero: false }` — everything else keeps the transparent-over-hero look. */
  private readonly hasHero = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.deepestRouteHasHero()),
      startWith(this.deepestRouteHasHero())
    ),
    { initialValue: true }
  );

  protected solidHeader = computed(() => this.isScrolled() || !this.hasHero());

  private deepestRouteHasHero(): boolean {
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.data['hasHero'] !== false;
  }

  protected participate(): void {
    this.analytics.track('cta_click', { cta: 'participer', place: 'header' });
    void this.launcher.open();
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected navLinkClasses(active: boolean): string {
    if (!this.solidHeader()) {
      return active
        ? 'border-white text-white'
        : 'border-transparent text-white/80 hover:border-white/40 hover:text-white';
    }

    return active
      ? 'border-primary-500 text-gray-950'
      : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-950';
  }

  protected updateScrolledState(): void {
    this.isScrolled.set(window.scrollY > 0);
  }
}
