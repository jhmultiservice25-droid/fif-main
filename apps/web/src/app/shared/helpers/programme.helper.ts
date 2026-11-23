import { IProgrammeSession, IRegistrationStatus } from '@/app/shared/interfaces';

const TIME = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kinshasa' });
const DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Festival times are always shown in Kinshasa time, whatever the device's timezone. */
export function sessionTime(value: string): string {
  return TIME.format(new Date(value)).replace(':', 'h');
}

export function sessionRange(session: Pick<IProgrammeSession, 'startsAt' | 'endsAt'>): string {
  return `${sessionTime(session.startsAt)} – ${sessionTime(session.endsAt)}`;
}

/** Formats a YYYY-MM-DD festival day as "mer. 25 nov.". */
export function festivalDayLabel(date: string): string {
  return DAY.format(new Date(`${date}T12:00:00Z`));
}

export function sessionsOverlap(a: Pick<IProgrammeSession, 'startsAt' | 'endsAt'>, b: Pick<IProgrammeSession, 'startsAt' | 'endsAt'>) {
  return new Date(a.startsAt) < new Date(b.endsAt) && new Date(b.startsAt) < new Date(a.endsAt);
}

export const SESSION_TYPE_LABELS: Record<string, string> = {
  PLENARY: 'Plénière',
  TALK: 'Talk',
  MASTERCLASS: 'Masterclass',
  WORKSHOP: 'Atelier',
  PITCH: 'Pitch',
  NETWORKING: 'Networking',
  BREAK: 'Pause',
  SOCIAL: 'Soirée',
  VILLAGE: 'Village'
};

export const REGISTRATION_STATUS_LABELS: Record<IRegistrationStatus, string> = {
  REGISTERED: 'Inscrit(e)',
  PENDING: 'En attente de validation',
  DECLINED: 'Refusé',
  WAITLISTED: "Liste d'attente",
  CANCELLED: 'Annulé'
};

export const REGISTRATION_STATUS_TONES: Record<IRegistrationStatus, string> = {
  REGISTERED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-800',
  DECLINED: 'bg-red-50 text-red-700',
  WAITLISTED: 'bg-violet-50 text-violet-700',
  CANCELLED: 'bg-gray-100 text-gray-600'
};
