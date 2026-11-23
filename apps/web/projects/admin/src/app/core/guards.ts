import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '@/app/domains/auth/data-access/auth.store';

/** The whole console is for ADMIN sessions only; anything else goes to the sign-in page. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  if (authStore.hasRights()) return true;
  const queryParams = state.url && state.url !== '/' ? { redirect: state.url } : {};
  return inject(Router).createUrlTree(['/connexion'], { queryParams });
};

export const guestGuard: CanActivateFn = () => {
  return inject(AuthStore).hasRights() ? inject(Router).parseUrl('/') : true;
};
