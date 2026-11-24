import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    title: 'HACKDEMY CTF 2026',
    data: { hasHero: false },
    loadComponent: () => import('./features/hackademy-ctf')
  }
];

export default routes;
