import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', title: 'Projets et solutions', loadComponent: () => import('./catalogue') },
  { path: 'solutions/:reference', title: 'Solution', data: { kind: 'SOLUTION' }, loadComponent: () => import('./catalogue-detail') },
  { path: 'soumis/:id', title: 'Projet', data: { kind: 'PROJECT' }, loadComponent: () => import('./catalogue-detail') }
];

export default routes;
