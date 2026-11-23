import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, Injector, PLATFORM_ID, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { FestivalStore } from '@/app/shared/data-access';

type IConsent = 'granted' | 'denied' | null;

const STORAGE_KEY = 'fif.analytics.consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Analytics 4 for the public site, in Consent Mode v2 "advanced": measurement runs from the
 * first page, but until the visitor accepts it is cookieless — Google receives anonymous pings with
 * no identifier and writes nothing to the device. Accepting adds the analytics cookie, which is what
 * makes returning visitors and full journeys measurable.
 *
 * The measurement id comes from the API, so it can be changed without rebuilding the site.
 */
@Injectable({ providedIn: 'root' })
export class Analytics {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly festival = inject(FestivalStore).info;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly consent = signal<IConsent>(null);
  private scriptLoaded = false;
  private started = false;

  /** Call once from the website layout; does nothing until a measurement id exists. */
  start(): void {
    if (!this.isBrowser || this.started) return;
    this.started = true;
    this.consent.set(this.storedConsent());
    this.bootDataLayer();

    // The id arrives with the festival payload, which may land after this call.
    effect(
      () => {
        if (!this.measurementId || this.scriptLoaded) return;
        this.loadScript();
        // The router has usually already settled the first navigation by now.
        this.pageView(this.router.url);
      },
      { injector: this.injector }
    );

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.pageView((event as NavigationEnd).urlAfterRedirects);
    });
  }

  get measurementId(): string | null {
    return this.festival().analyticsMeasurementId ?? null;
  }

  /** True while a decision is still needed and analytics is actually configured. */
  get shouldAsk(): boolean {
    return this.isBrowser && !!this.measurementId && this.consent() === null;
  }

  /** Full measurement: the analytics cookie is written, so returning visits are recognised. */
  accept(): void {
    this.setConsent('granted');
  }

  /** Anonymous measurement only: cookieless pings continue, nothing is stored on the device. */
  decline(): void {
    this.setConsent('denied');
  }

  /** Named site actions worth counting (see TRACKED_EVENTS on the server). */
  track(event: string, params: Record<string, string | number | boolean> = {}): void {
    if (!this.isBrowser || !this.scriptLoaded) return;
    window.gtag?.('event', event, params);
  }

  private pageView(path: string): void {
    if (!this.scriptLoaded) return;
    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_location: this.document.location?.href,
      page_title: this.document.title
    });
  }

  private setConsent(value: Exclude<IConsent, null>): void {
    this.consent.set(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* private browsing: the choice simply is not remembered */
    }
    window.gtag?.('consent', 'update', {
      analytics_storage: value,
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }

  private storedConsent(): IConsent {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return value === 'granted' || value === 'denied' ? value : null;
    } catch {
      return null;
    }
  }

  private bootDataLayer(): void {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag =
      window.gtag ??
      function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    // Storage stays denied until the visitor accepts; advertising signals stay off for good.
    window.gtag('consent', 'default', {
      analytics_storage: this.consent() === 'granted' ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }

  private loadScript(): void {
    const id = this.measurementId;
    if (!id || this.scriptLoaded) return;
    this.scriptLoaded = true;
    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    this.document.head.appendChild(script);
    window.gtag?.('js', new Date());
    // Page views are sent by the router subscription, with the resolved SPA path.
    window.gtag?.('config', id, { send_page_view: false, anonymize_ip: true });
  }
}
