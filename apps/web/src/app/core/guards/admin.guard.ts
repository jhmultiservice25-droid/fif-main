import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { environment } from '@/environments/environment';

/** Maps a legacy `/admin/...` URL of the public site to the same page in the organizer console. */
export function adminConsoleUrl(url: string): string {
  return environment.adminUrl + (url.replace(/^\/admin(?=\/|\?|$)/, '') || '/');
}

/**
 * The console moved to its own origin (ADR-001). Old links and already-printed badge QR codes
 * (`/admin/checkin?code=…`) land here and are forwarded with path and query intact.
 */
export const adminConsoleRedirect: CanActivateFn = (_route, state) => {
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    window.location.replace(adminConsoleUrl(state.url));
  }
  return false;
};
