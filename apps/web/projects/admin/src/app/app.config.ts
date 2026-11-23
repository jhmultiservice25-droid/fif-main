import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, TitleStrategy, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideIcons } from '@/app/core/icons/provider';
import { httpInterceptor } from '@/app/core/interceptors';
import { provideTheming } from '@/app/core/theming';
import { AuthStore } from '@/app/domains/auth/data-access/auth.store';
import { FestivalStore, MarketplaceCatalogStore } from '@/app/shared/data-access';
import { routes } from './app.routes';
import { AdminTitleStrategy } from './core/admin-title.strategy';

export const adminConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([httpInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),
    { provide: TitleStrategy, useClass: AdminTitleStrategy },
    provideAppInitializer(() => {
      inject(MarketplaceCatalogStore).load().subscribe();
      void inject(FestivalStore).load();
      return inject(AuthStore).initialize();
    }),
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { subscriptSizing: 'dynamic' } },
    provideNativeDateAdapter(),
    provideAnimationsAsync(),
    provideIcons(),
    provideTheming({ primary: '#006da4', error: '#dc2626' })
  ]
};
