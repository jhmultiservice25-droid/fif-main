import { Routes } from '@angular/router';
import { innovatorGuard } from '@/app/core/guards';
import { InnovatorLayout } from './layout/layout';

const routes: Routes = [
  {
    path: 'interdit',
    title: 'Accès refusé',
    loadComponent: () => import('./features/forbidden/forbidden')
  },
  {
    path: '',
    component: InnovatorLayout,
    canActivate: [innovatorGuard],
    children: [
      { path: '', redirectTo: 'apercu', pathMatch: 'full' },
      {
        path: 'apercu',
        title: 'Aperçu',
        loadComponent: () => import('./features/overview/overview')
      },
      {
        path: 'profil',
        title: 'Profil innovateur',
        loadComponent: () => import('./features/profile/innovator-profile')
      },
      {
        path: 'projets',
        title: 'Projets',
        loadComponent: () => import('./features/projects/project-list')
      },
      {
        path: 'projets/nouveau',
        title: 'Nouveau projet',
        loadComponent: () => import('./features/projects/project-form')
      },
      {
        path: 'projets/:id',
        title: 'Modifier le projet',
        loadComponent: () => import('./features/projects/project-form')
      },
      { path: 'notifications', redirectTo: 'apercu' },
      {
        path: 'presentations',
        title: 'Mes présentations',
        loadComponent: () => import('./features/presentations/presentations')
      },
      {
        path: 'programme',
        title: 'Mon programme',
        loadComponent: () => import('./features/programme/programme')
      }
    ]
  }
];

export default routes;
