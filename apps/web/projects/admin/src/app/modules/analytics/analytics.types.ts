export interface IAnalyticsTotals {
  users: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  averageSessionDuration: number;
  averageTimePerPage: number;
  bounceRate: number;
}

export interface IAnalyticsSetupItem {
  key: string;
  label: string;
  hint: string;
  present: boolean;
}

export interface IAnalyticsOverview {
  configured: boolean;
  message?: string;
  measurementId: string | null;
  checklist?: IAnalyticsSetupItem[];
  missingCount?: number;
  trackingActive?: boolean;
  guide?: string;
  period?: string;
  totals?: IAnalyticsTotals;
  byDay?: { date: string; users: number; sessions: number }[];
  pages?: { path: string; views: number; users: number; averageTime: number }[];
  events?: { name: string; label: string; tracked: boolean; count: number; users: number }[];
  sources?: { label: string; sessions: number }[];
  devices?: { label: string; sessions: number }[];
  refreshedAt?: string;
}
