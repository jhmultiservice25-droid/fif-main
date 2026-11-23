import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './ui/header/header';
import { Footer } from './ui/footer/footer';
import { Analytics, ConsentBanner } from '@/app/core/analytics';
import { PageLoader } from '@/app/shared/ui';

@Component({
  selector: 'web-layout',
  imports: [RouterOutlet, Header, Footer, PageLoader, ConsentBanner],
  template: `
    @defer (on immediate) {
      <div class="min-h-screen overflow-x-hidden">
        <app-header />
        <main id="main-content">
          <router-outlet />
        </main>
        <app-footer />
        <consent-banner />
      </div>
    } @placeholder {
      <app-page-loader />
    } @loading (minimum 500ms) {
      <app-page-loader />
    }
  `
})
export class WebLayout implements OnInit {
  private readonly analytics = inject(Analytics);

  ngOnInit(): void {
    this.analytics.start();
  }
}
