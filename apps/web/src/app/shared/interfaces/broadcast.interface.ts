export type IBroadcastAudienceId = 'PARTICIPANT' | 'SPEAKER' | 'COMMITTEE' | 'VOLUNTEER' | 'INNOVATOR' | 'ORGANIZATION';

export interface IBroadcastAudience {
  id: IBroadcastAudienceId;
  label: string;
  count: number;
}

export interface IBroadcastPayload {
  audiences: IBroadcastAudienceId[];
  subject: string;
  body: string;
}

export interface IBroadcastResult {
  recipients: number;
  sent: number;
  failed: number;
}
