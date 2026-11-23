import { Routes } from '@angular/router';
import { adminGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'connexion',
    title: 'Connexion',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/sign-in/sign-in')
  },
  { path: 'auth/connexion', redirectTo: 'connexion' },
  {
    path: '',
    canActivate: [adminGuard],
    loadChildren: () => import('./routes')
  },
  { path: '**', redirectTo: '' }
];
