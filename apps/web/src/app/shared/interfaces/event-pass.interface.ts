export type IEventPassKind = 'COMMITTEE' | 'VOLUNTEER' | 'INNOVATOR' | 'ORGANIZATION' | 'PARTICIPANT';

export interface IEventPass {
  id: string;
  kind: IEventPassKind;
  fullName: string;
  email: string;
  checkedInAt: string | null;
  emailSentAt: string | null;
  createdAt: string;
}

export interface IMyEventPass extends IEventPass {
  qrCodeDataUrl: string;
}

export interface ICheckInResult extends IEventPass {
  alreadyCheckedIn: boolean;
}

export interface IResendEmailResult extends IEventPass {
  emailSent: boolean;
}
