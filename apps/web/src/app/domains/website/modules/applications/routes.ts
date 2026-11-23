import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'committee',
    title: 'Candidature comité',
    loadComponent: () =>
      import('./features/committee-application/committee-application').then(
        (component) => component.CommitteeApplication
      )
  },
  {
    // Registration now happens in the programme modal on the home page (PRD-001).
    path: 'participant',
    redirectTo: () => '/?participer=1'
  },
  {
    path: 'badge',
    data: { hasHero: false },
    loadComponent: () =>
      import('./features/participant-badge/participant-badge').then((m) => m.ParticipantBadge)
  },
  {
    path: 'volunteer',
    title: 'Devenir volontaire',
    loadComponent: () =>
      import('./features/volunteer-application/volunteer-application').then(
        (component) => component.VolunteerApplication
      )
  },
  { path: '', pathMatch: 'full', redirectTo: () => '/?participer=1' }
];

export default routes;
