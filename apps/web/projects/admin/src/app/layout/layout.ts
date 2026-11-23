import { Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Media } from '@/app/core/media';
import { Navigation } from '@/app/shared/ui/navigation/navigation';
import { NotificationBell } from '@/app/shared/ui/notification-bell/notification-bell';
import { PageLoader } from '@/app/shared/ui/page-loader/page-loader';
import { User } from '@/app/shared/ui/user/user';
import { environment } from '@/environments/environment';
import { CommandPalette } from './command-palette/command-palette';
import { NAVIGATION } from './data/navigation';

@Component({
  selector: 'admin-layout',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    Navigation,
    NotificationBell,
    PageLoader,
    RouterLink,
    RouterOutlet,
    User
  ],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './layout.html'
})
export class AdminLayout {
  private readonly media = inject(Media);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly sidenav = viewChild<MatSidenav>('sidenav');

  protected readonly navigation = NAVIGATION;
  protected readonly websiteUrl = environment.websiteUrl;
  protected readonly isMobile = computed(() => this.media.match('(max-width: 1023px)')());
  protected readonly isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  protected readonly pageTitle = signal('');

  constructor() {
    const subscription = this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.pageTitle.set(this.currentTitle());
      if (this.isMobile()) void this.sidenav()?.close();
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
    this.pageTitle.set(this.currentTitle());
  }

  protected openPalette(): void {
    if (this.dialog.getDialogById('command-palette')) return;
    this.dialog.open(CommandPalette, {
      id: 'command-palette',
      width: '640px',
      maxWidth: 'calc(100vw - 2rem)',
      position: { top: '12vh' },
      panelClass: 'command-palette-panel',
      autoFocus: 'input',
      restoreFocus: true
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openPalette();
    }
  }

  private currentTitle(): string {
    let route = this.route.snapshot;
    let title = '';
    while (route) {
      if (typeof route.routeConfig?.title === 'string') title = route.routeConfig.title;
      route = route.firstChild!;
    }
    return title;
  }
}
