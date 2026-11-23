export interface IFestivalDay {
  date: string;
  label: string;
  theme: string;
}

export interface IFestivalInfo {
  name: string;
  shortName: string;
  city: string;
  country: string;
  location: string;
  days: IFestivalDay[];
  /** "2–4 décembre 2026" */
  dateLabel: string;
  /** "2–4 déc. 2026" */
  shortDateLabel: string;
  startsAt: string | null;
  endsAt: string | null;
  badgeDeadline: string | null;
  applicationsOpenAt: string | null;
  applicationsCloseAt: string | null;
  applicationsOpen: boolean;
  /** GA4 measurement id (G-…), or null when analytics is not configured. */
  analyticsMeasurementId: string | null;
  updatedAt: string;
}

export interface IFestivalSettingsPayload {
  name?: string;
  shortName?: string;
  city?: string;
  country?: string;
  days?: IFestivalDay[];
  badgeDeadline?: string | null;
  applicationsOpenAt?: string | null;
  applicationsCloseAt?: string | null;
}

export interface IFestivalDaysPreview {
  moves: { from: string; to: string; sessions: number; speakers: number }[];
  removed: string[];
  removedSessions: number;
}
