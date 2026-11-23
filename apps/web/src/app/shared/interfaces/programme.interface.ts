export type IProgrammeAdmission = 'NONE' | 'OPEN' | 'APPROVAL';
export type IRegistrationStatus = 'REGISTERED' | 'PENDING' | 'DECLINED' | 'WAITLISTED' | 'CANCELLED';

export interface IProgrammeSession {
  id: string;
  code: string | null;
  title: string;
  description: string;
  type: string;
  /** YYYY-MM-DD in Kinshasa time. */
  day: string;
  startsAt: string;
  endsAt: string;
  room: { id: string; name: string; color: string } | null;
  admission: IProgrammeAdmission;
  status: 'SCHEDULED' | 'CANCELLED';
  cancelReason: string | null;
  capacity: number | null;
  seatsLeft: number | null;
  speakers: { id: string; name: string; title: string; photoUrl: string | null }[];
}

export interface IProgrammeDayInfo {
  date: string;
  label: string;
  theme: string;
}

export interface IProgrammeDay extends IProgrammeDayInfo {
  sessions: IProgrammeSession[];
}

export interface IProgramme {
  days: IProgrammeDay[];
}

export interface IProgrammeChange {
  kind: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  at: string;
}

export interface IMyProgrammeItem {
  session: IProgrammeSession;
  status: IRegistrationStatus;
  note: string | null;
  requestedAt: string;
  changes: IProgrammeChange[];
}

export interface IMyProgramme {
  days: IProgrammeDayInfo[];
  items: IMyProgrammeItem[];
}

export interface IJoinResult {
  sessionId: string;
  title: string;
  status: IRegistrationStatus;
}

export interface IParticipantIdentity {
  firstName: string;
  lastName: string;
  postnom: string;
  city: string;
  whatsapp: string;
  organization?: string;
}

export interface IStartInterestResult {
  needsIdentity: boolean;
  codeSent: boolean;
  /** Present only while the API has no e-mail provider: the fixed code to type. */
  fallbackCode?: string;
}

export interface IVerifyCodeResult {
  user: { id: string; email: string; name: string; role: string };
  isNewParticipant: boolean;
  results: IJoinResult[];
  qrCodeDataUrl: string | null;
}

export interface IParticipantProfile {
  id: string;
  firstName: string;
  lastName: string;
  postnom: string;
  fullName: string;
  email: string;
  city: string;
  whatsapp: string;
  organization: string | null;
}
