/**
 * Card colours per session type: a soft tinted surface with a matching hairline border and a small dot —
 * no side stripes. Full class strings so Tailwind can see them.
 */
export const TYPE_STYLES: Record<string, { card: string; dot: string }> = {
  PLENARY: { card: 'bg-primary-50 border-primary-200/70 text-primary-950 hover:bg-primary-100/70', dot: 'bg-primary-500' },
  TALK: { card: 'bg-sky-50 border-sky-200/70 text-sky-950 hover:bg-sky-100/70', dot: 'bg-sky-500' },
  MASTERCLASS: { card: 'bg-violet-50 border-violet-200/70 text-violet-950 hover:bg-violet-100/70', dot: 'bg-violet-500' },
  WORKSHOP: { card: 'bg-indigo-50 border-indigo-200/70 text-indigo-950 hover:bg-indigo-100/70', dot: 'bg-indigo-500' },
  PITCH: { card: 'bg-amber-50 border-amber-200/70 text-amber-950 hover:bg-amber-100/70', dot: 'bg-amber-500' },
  NETWORKING: { card: 'bg-emerald-50 border-emerald-200/70 text-emerald-950 hover:bg-emerald-100/70', dot: 'bg-emerald-500' },
  BREAK: { card: 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200/60', dot: 'bg-stone-400' },
  SOCIAL: { card: 'bg-rose-50 border-rose-200/70 text-rose-950 hover:bg-rose-100/70', dot: 'bg-rose-500' },
  VILLAGE: { card: 'bg-teal-50 border-teal-200/70 text-teal-950 hover:bg-teal-100/70', dot: 'bg-teal-500' }
};

/** Hatched grey surface for cancelled sessions. */
export const CANCELLED_CARD =
  'border-gray-200 text-gray-400 bg-[repeating-linear-gradient(135deg,#f9fafb_0,#f9fafb_6px,#f3f4f6_6px,#f3f4f6_12px)]';

export const typeStyle = (type: string) => TYPE_STYLES[type] ?? TYPE_STYLES['TALK'];

/** Kinshasa minutes since midnight for an ISO instant (UTC+1, no DST). */
export function kinshasaMinutes(value: string): number {
  const date = new Date(new Date(value).getTime() + 60 * 60 * 1000);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/** ISO instant for a festival day (YYYY-MM-DD) and Kinshasa minutes since midnight. */
export function kinshasaIso(day: string, minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return new Date(`${day}T${hours}:${mins}:00+01:00`).toISOString();
}

export const toHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const fromHHMM = (value: string) => {
  const [hours, mins] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (mins ?? 0);
};
