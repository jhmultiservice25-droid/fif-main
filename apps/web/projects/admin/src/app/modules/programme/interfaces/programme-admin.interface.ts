import { IProgrammeAdmission, IProgrammeDayInfo, IRegistrationStatus } from '@/app/shared/interfaces';

export type IVisibility = 'PUBLIC' | 'INVITE_ONLY';

export interface IRoom {
  id: string;
  name: string;
  capacity: number | null;
  color: string;
  order: number;
}

export interface IConflict {
  code: 'SPEAKER_OVERLAP' | 'ROOM_OVERLAP' | 'CAPACITY_BELOW_REGISTERED' | 'PARALLEL';
  severity: 'blocking' | 'info';
  message: string;
  sessionIds: string[];
}

export interface IAdminSession {
  id: string;
  code: string | null;
  title: string;
  description: string;
  type: string;
  day: string;
  startsAt: string;
  endsAt: string;
  roomId: string | null;
  room: { id: string; name: string; color: string } | null;
  visibility: IVisibility;
  admission: IProgrammeAdmission;
  capacity: number | null;
  waitlistEnabled: boolean;
  status: 'SCHEDULED' | 'CANCELLED';
  cancelReason: string | null;
  version: number;
  speakers: { id: string; name: string; title: string; photoUrl: string | null }[];
  counts: { registered: number; pending: number; waitlisted: number };
  conflicts: IConflict[];
}

export interface IProgrammeOverview {
  days: IProgrammeDayInfo[];
  rooms: IRoom[];
  sessions: IAdminSession[];
}

export interface ISessionInput {
  title: string;
  description: string;
  type: string;
  startsAt: string;
  endsAt: string;
  roomId: string | null;
  speakerIds: string[];
  visibility: IVisibility;
  admission: IProgrammeAdmission;
  capacity: number | null;
  waitlistEnabled: boolean;
  acknowledgeConflicts?: boolean;
  version?: number;
}

export interface IAttendee {
  registrationId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  city: string | null;
  organization: string | null;
  status: IRegistrationStatus;
  note: string | null;
  requestedAt: string;
}

export interface IRequestGroup {
  session: { id: string; title: string; startsAt: string; endsAt: string; room: string | null; capacity: number | null };
  requests: IAttendee[];
}

export interface ISessionChangeEntry {
  id: string;
  kind: 'CREATED' | 'UPDATED' | 'CANCELLED';
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  actor: string | null;
  at: string;
}
