import { Injectable } from "@nestjs/common";
import { GoogleAnalyticsClient, IReportResponse } from "./google-analytics.client";

const CACHE_TTL_MS = 10 * 60 * 1000;

/** Custom events the public site sends; shown with readable labels in the console. */
export const TRACKED_EVENTS: Record<string, string> = {
  application_submitted: "Candidatures envoyées",
  registration_completed: "Inscriptions au programme",
  registration_started: "Inscriptions commencées",
  solution_contacted: "Mises en relation",
  badge_downloaded: "Badges téléchargés",
  cta_click: "Clics sur les boutons clés",
};

export type IAnalyticsPeriod = "7d" | "28d" | "90d";

const RANGES: Record<IAnalyticsPeriod, string> = { "7d": "7daysAgo", "28d": "28daysAgo", "90d": "90daysAgo" };

const num = (value: string | undefined) => Number(value ?? 0) || 0;
const firstRow = (report: IReportResponse, index = 0) => report.totals?.[0]?.metricValues?.[index]?.value;

@Injectable()
export class AnalyticsService {
  private readonly client = GoogleAnalyticsClient.fromEnv();
  private readonly cache = new Map<string, { at: number; data: unknown }>();

  get configured(): boolean {
    return !!this.client;
  }

  /** Key metrics for the console dashboard: audience, pages, events and a daily visit curve. */
  async overview(period: IAnalyticsPeriod) {
    if (!this.client) {
      const checklist = GoogleAnalyticsClient.status();
      const missing = checklist.filter((item) => !item.present);
      const tracking = checklist[0].present;
      return {
        configured: false,
        measurementId: process.env.GA_MEASUREMENT_ID ?? null,
        checklist,
        missingCount: missing.length,
        /** The site already counts visits; only the console side is incomplete. */
        trackingActive: tracking,
        message: tracking
          ? "La mesure tourne sur le site, mais la console ne peut pas encore lire les chiffres : il manque les accès en lecture."
          : "La mesure d'audience n'est pas encore activée. Les réglages ci-dessous restent à fournir.",
        guide: "docs/analytics-google-setup.md",
      };
    }
    const cached = this.cache.get(period);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

    const startDate = RANGES[period];
    const dateRanges = [{ startDate, endDate: "today" }];
    const [totals, byDay, pages, events, sources, devices] = await Promise.all([
      this.client.runReport({
        dateRanges,
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "userEngagementDuration" },
          { name: "bounceRate" },
          { name: "newUsers" },
        ],
      }),
      this.client.runReport({
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 120,
      }),
      this.client.runReport({
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }, { name: "userEngagementDuration" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 15,
      }),
      this.client.runReport({
        dateRanges,
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 30,
      }),
      this.client.runReport({
        dateRanges,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      this.client.runReport({
        dateRanges,
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 5,
      }),
    ]);

    const pageViews = num(firstRow(totals, 2));
    const engagement = num(firstRow(totals, 4));
    const data = {
      configured: true,
      period,
      measurementId: process.env.GA_MEASUREMENT_ID ?? null,
      totals: {
        users: num(firstRow(totals, 0)),
        newUsers: num(firstRow(totals, 6)),
        sessions: num(firstRow(totals, 1)),
        pageViews,
        /** Seconds, as GA reports them; the console formats them. */
        averageSessionDuration: num(firstRow(totals, 3)),
        averageTimePerPage: pageViews ? engagement / pageViews : 0,
        bounceRate: num(firstRow(totals, 5)),
      },
      byDay: (byDay.rows ?? []).map((row) => ({
        date: this.isoDate(row.dimensionValues?.[0]?.value ?? ""),
        users: num(row.metricValues?.[0]?.value),
        sessions: num(row.metricValues?.[1]?.value),
      })),
      pages: (pages.rows ?? []).map((row) => {
        const views = num(row.metricValues?.[0]?.value);
        return {
          path: row.dimensionValues?.[0]?.value ?? "",
          views,
          users: num(row.metricValues?.[1]?.value),
          averageTime: views ? num(row.metricValues?.[2]?.value) / views : 0,
        };
      }),
      events: (events.rows ?? []).map((row) => {
        const name = row.dimensionValues?.[0]?.value ?? "";
        return {
          name,
          label: TRACKED_EVENTS[name] ?? name,
          tracked: name in TRACKED_EVENTS,
          count: num(row.metricValues?.[0]?.value),
          users: num(row.metricValues?.[1]?.value),
        };
      }),
      sources: (sources.rows ?? []).map((row) => ({
        label: row.dimensionValues?.[0]?.value ?? "",
        sessions: num(row.metricValues?.[0]?.value),
      })),
      devices: (devices.rows ?? []).map((row) => ({
        label: row.dimensionValues?.[0]?.value ?? "",
        sessions: num(row.metricValues?.[0]?.value),
      })),
      refreshedAt: new Date().toISOString(),
    };
    this.cache.set(period, { at: Date.now(), data });
    return data;
  }

  /** GA returns YYYYMMDD. */
  private isoDate(value: string): string {
    return value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}` : value;
  }
}
