import { Routes } from '@angular/router';
import { WebLayout } from '@/app/domains/website/layout/layout';

const routes: Routes = [
  {
    path: '',
    component: WebLayout,
    children: [
      {
        path: '',
        loadChildren: () => import('./modules/landing/routes')
      },
      {
        path: 'applications',
        loadChildren: () => import('./modules/applications/routes')
      },
      {
        path: 'mon-espace',
        title: 'Mon espace',
        data: { hasHero: false },
        loadComponent: () => import('./modules/programme/space/space')
      },
      {
        path: 'connexion',
        title: 'Connexion',
        data: { hasHero: false },
        loadComponent: () => import('./modules/programme/space/space')
      },
      {
        path: 'rejoindre',
        data: { hasHero: false },
        loadChildren: () => import('./modules/onboarding/routes')
      },
      {
        path: 'projets',
        data: { hasHero: false },
        loadChildren: () => import('./modules/catalogue/routes')
      },
      {
        path: 'privacy',
        title: 'Politique de confidentialité',
        data: { hasHero: false },
        loadComponent: () => import('./modules/legal/privacy')
      },
      {
        path: 'terms',
        title: 'Conditions d’utilisation',
        data: { hasHero: false },
        loadComponent: () => import('./modules/legal/terms')
      },
      // Speakers are a section of the home page now; keep old links working.
      { path: 'speakers', redirectTo: () => '/#speakers' },
      { path: '**', redirectTo: '' }
    ]
  }
];

export default routes;
