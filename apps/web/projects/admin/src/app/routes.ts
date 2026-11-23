import { MatPaginatorIntl } from '@angular/material/paginator';
import { Routes } from '@angular/router';
import { provideFrenchPaginatorIntl } from '@/app/core/paginator/french-paginator-intl';
import { AdminLayout } from './layout/layout';

const routes: Routes = [
  {
    path: '',
    component: AdminLayout,
    providers: [{ provide: MatPaginatorIntl, useFactory: provideFrenchPaginatorIntl }],
    children: [
      {
        path: '',
        title: 'Vue d’ensemble',
        loadComponent: () => import('./modules/stats/features/stats')
      },
      {
        path: 'applications',
        title: 'Candidatures',
        loadComponent: () => import('./modules/applications/features/application-list/application-list')
      },
      {
        path: 'applications/:id',
        title: 'Détail de la candidature',
        loadComponent: () => import('./modules/applications/features/application-detail/application-detail')
      },
      { path: 'notifications', redirectTo: '' },
      {
        path: 'besoins',
        title: 'Fiches de besoin',
        loadComponent: () => import('./modules/marketplace/features/admin-need-list/admin-need-list')
      },
      {
        path: 'besoins/:id',
        title: 'Détail fiche',
        loadComponent: () => import('./modules/marketplace/features/admin-need-detail/admin-need-detail')
      },
      {
        path: 'projets',
        title: 'Projets',
        loadComponent: () => import('./modules/marketplace/features/admin-project-list/admin-project-list')
      },
      {
        path: 'projets/:id',
        title: 'Détail projet',
        loadComponent: () => import('./modules/marketplace/features/admin-project-detail/admin-project-detail')
      },
      {
        path: 'programme',
        title: 'Programme',
        loadComponent: () => import('./modules/programme/features/programme-calendar')
      },
      {
        path: 'programme/demandes',
        title: 'Demandes',
        loadComponent: () => import('./modules/programme/features/requests-inbox')
      },
      {
        path: 'programme/salles',
        title: 'Salles',
        loadComponent: () => import('./modules/programme/features/rooms')
      },
      {
        path: 'audience',
        title: 'Audience',
        loadComponent: () => import('./modules/analytics/analytics-dashboard')
      },
      {
        path: 'festival',
        title: 'Festival',
        loadComponent: () => import('./modules/festival/festival-settings')
      },
      {
        path: 'solutions',
        title: 'Solutions FIF',
        loadComponent: () => import('./modules/showcase/showcase-admin')
      },
      {
        path: 'mises-en-relation',
        title: 'Mises en relation',
        loadComponent: () => import('./modules/showcase/contact-messages')
      },
      {
        path: 'speakers',
        title: 'Speakers',
        loadComponent: () => import('./modules/speakers/features/speaker-list/speaker-list')
      },
      {
        path: 'speakers/nouveau',
        title: 'Nouvel intervenant',
        loadComponent: () => import('./modules/speakers/features/speaker-form/speaker-form')
      },
      {
        path: 'speakers/:id',
        title: 'Modifier l’intervenant',
        loadComponent: () => import('./modules/speakers/features/speaker-form/speaker-form')
      },
      {
        path: 'participants',
        title: 'Participants',
        loadComponent: () => import('./modules/participants/features/participant-list/participant-list')
      },
      {
        path: 'diffusion',
        title: 'Diffusion',
        loadComponent: () => import('./modules/broadcast/features/broadcast-composer/broadcast-composer')
      },
      {
        path: 'checkin',
        title: 'Contrôle d’accès',
        loadComponent: () => import('./modules/checkin/features/checkin-desk/checkin-desk')
      }
    ]
  }
];

export default routes;
