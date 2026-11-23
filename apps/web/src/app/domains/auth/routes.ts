import { Routes } from '@angular/router';

/** Password sign-in and sign-up are gone for attendees (ADR-005): old links land on the code-based pages. */
const routes: Routes = [
  { path: 'connexion', redirectTo: '/connexion', pathMatch: 'full' },
  { path: 'sign-in', redirectTo: '/connexion', pathMatch: 'full' },
  { path: 'inscription/innovateur', redirectTo: '/rejoindre/innovateur', pathMatch: 'full' },
  { path: 'inscription/organisation', redirectTo: '/rejoindre/organisation', pathMatch: 'full' },
  { path: '**', redirectTo: '/rejoindre' }
];

export default routes;
