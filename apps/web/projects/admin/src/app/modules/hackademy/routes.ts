import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    title: 'HACKDEMY CTF 2026',
    loadComponent: () => import('./features/hackademy-applications')
  }
];

export default routes;
