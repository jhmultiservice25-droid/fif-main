import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, PLATFORM_ID, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { IApiSuccess, IParticipantNotification, IParticipantNotificationList } from '@/app/shared/interfaces';

const REFRESH_INTERVAL_MS = 60_000;

@Component({
  selector: 'notification-bell',
  templateUrl: './notification-bell.html',
  imports: [MatButtonModule, MatIconModule, MatMenuModule]
})
export class NotificationBell {
  /** `admin` reads the staff inbox, `participant` the signed-in innovator/organization inbox. */
  readonly scope = input.required<'admin' | 'participant'>();

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly endpoint = computed(() => (this.scope() === 'admin' ? '/admin/notifications' : '/me/notifications'));
  protected readonly resource = httpResource<IApiSuccess<IParticipantNotificationList>>(
    () => `${this.endpoint()}?limit=10`
  );

  protected readonly isUpdating = signal(false);
  protected readonly items = computed(() => (this.resource.hasValue() ? this.resource.value().data.items : []));
  protected readonly unread = computed(() => (this.resource.hasValue() ? this.resource.value().data.unread : 0));

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const timer = setInterval(() => this.resource.reload(), REFRESH_INTERVAL_MS);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected open(notification: IParticipantNotification, trigger: MatMenuTrigger): void {
    if (!notification.readAt) {
      this.patch(`${this.endpoint()}/${encodeURIComponent(notification.id)}/read`);
    }
    const route = this.routeFor(notification);
    if (route) {
      trigger.closeMenu();
      void this.router.navigateByUrl(route);
    }
  }

  protected markAllRead(): void {
    this.patch(`${this.endpoint()}/read-all`);
  }

  protected routeFor(notification: IParticipantNotification): string | null {
    if (!notification.href) return null;
    // The console is its own app: staff links are served from its root.
    return this.scope() === 'admin' ? notification.href.replace(/^\/admin(?=\/|$)/, '') || '/' : notification.href;
  }

  protected relativeTime(value: string): string {
    const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
    if (minutes < 1) return 'À l’instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.round(hours / 24);
    if (days < 7) return `Il y a ${days} j`;
    return new Intl.DateTimeFormat('fr-CD', { dateStyle: 'medium' }).format(new Date(value));
  }

  private patch(url: string): void {
    this.isUpdating.set(true);
    this.http.patch(url, {}).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.resource.reload();
      },
      error: () => this.isUpdating.set(false)
    });
  }
}
