import { Route } from '@angular/router';
import { adminConsoleRedirect } from './core/guards';

export const routes: Route[] = [
  {
    path: 'auth',
    loadChildren: () => import('./domains/auth/routes')
  },
  {
    path: 'admin',
    canActivate: [adminConsoleRedirect],
    children: [{ path: '**', children: [] }]
  },
  {
    path: 'organisation',
    loadChildren: () => import('./domains/organization/routes')
  },
  {
    path: 'innovateur',
    loadChildren: () => import('./domains/innovator/routes')
  },
  {
    path: '',
    loadChildren: () => import('./domains/website/routes')
  }
];
