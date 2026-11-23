import { Routes } from '@angular/router';
import { organizationGuard } from '@/app/core/guards';
import { OrganizationLayout } from './layout/layout';

const routes: Routes = [
  {
    path: 'interdit',
    title: 'Accès refusé',
    loadComponent: () => import('./features/forbidden/forbidden')
  },
  {
    path: '',
    component: OrganizationLayout,
    canActivate: [organizationGuard],
    children: [
      { path: '', redirectTo: 'apercu', pathMatch: 'full' },
      {
        path: 'apercu',
        title: 'Aperçu',
        loadComponent: () => import('./features/overview/overview')
      },
      {
        path: 'profil',
        title: 'Profil organisation',
        loadComponent: () => import('./features/profile/organization-profile')
      },
      {
        path: 'fiches',
        title: 'Fiches de besoin',
        loadComponent: () => import('./features/needs/need-list')
      },
      {
        path: 'fiches/nouveau',
        title: 'Nouvelle fiche',
        loadComponent: () => import('./features/needs/need-form')
      },
      {
        path: 'fiches/:id',
        title: 'Modifier la fiche',
        loadComponent: () => import('./features/needs/need-form')
      },
      { path: 'notifications', redirectTo: 'apercu' },
      {
        path: 'programme',
        title: 'Mon programme',
        loadComponent: () => import('./features/programme/programme')
      }
    ]
  }
];

export default routes;
