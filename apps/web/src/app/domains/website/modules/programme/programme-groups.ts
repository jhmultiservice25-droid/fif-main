import { IProgrammeSession } from '@/app/shared/interfaces';

/** Sessions sharing the exact same slot collapse into one row on the home page to keep it short. */
export interface IProgrammeSlot {
  key: string;
  startsAt: string;
  endsAt: string;
  sessions: IProgrammeSession[];
}

export function groupBySlot(sessions: IProgrammeSession[]): IProgrammeSlot[] {
  const slots = new Map<string, IProgrammeSlot>();
  for (const session of sessions) {
    const key = `${session.startsAt}|${session.endsAt}`;
    const slot = slots.get(key) ?? { key, startsAt: session.startsAt, endsAt: session.endsAt, sessions: [] };
    slot.sessions.push(session);
    slots.set(key, slot);
  }
  return [...slots.values()];
}
