import { environment } from '@/environments/environment';

/** Uploaded files are served by the API, not the web origin, so relative paths must be prefixed. */
export function apiAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return /^(https?:|blob:|data:)/.test(path) ? path : environment.apiUrl + path;
}
