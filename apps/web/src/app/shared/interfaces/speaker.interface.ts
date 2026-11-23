export interface ISpeaker {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoUrl: string | null;
  /** Only returned by admin endpoints. */
  email?: string | null;
  days: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ISpeakerPayload {
  name?: string;
  title?: string;
  bio?: string;
  email?: string;
  days?: string[];
  order?: number;
}

export interface ISpeakerDay {
  id: string;
  label: string;
}
