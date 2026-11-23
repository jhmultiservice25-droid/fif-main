import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', title: 'Rejoindre le FIF 2026', loadComponent: () => import('./join-choice') },
  { path: 'innovateur', title: 'Soumettre une solution', data: { profile: 'INNOVATOR' }, loadComponent: () => import('./onboarding') },
  { path: 'organisation', title: 'Publier un besoin', data: { profile: 'ORGANIZATION' }, loadComponent: () => import('./onboarding') }
];

export default routes;
