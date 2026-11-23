import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexStroke,
  ApexXAxis,
  ChartComponent
} from 'ng-apexcharts';
import { IApiSuccess } from '@/app/shared/interfaces';
import { IAnalyticsOverview } from './analytics.types';

const PERIODS = [
  { id: '7d', label: '7 jours' },
  { id: '28d', label: '28 jours' },
  { id: '90d', label: '90 jours' }
];

/** Console › Audience: Google Analytics figures for the public site (PRD: analytics). */
@Component({
  imports: [ChartComponent, DatePipe, DecimalPipe, MatButtonModule, MatIconModule],
  templateUrl: './analytics-dashboard.html'
})
export default class AnalyticsDashboard {
  protected readonly periods = PERIODS;
  protected readonly period = signal('28d');

  protected readonly resource = httpResource<IApiSuccess<IAnalyticsOverview>>(
    () => `/admin/analytics?period=${this.period()}`
  );

  protected readonly data = computed(() => (this.resource.hasValue() ? this.resource.value().data : null));
  protected readonly totals = computed(() => this.data()?.totals ?? null);
  protected readonly trackedEvents = computed(() => (this.data()?.events ?? []).filter((event) => event.tracked));
  protected readonly otherEvents = computed(() =>
    (this.data()?.events ?? []).filter((event) => !event.tracked).slice(0, 6)
  );
  protected readonly maxSource = computed(() => Math.max(1, ...(this.data()?.sources ?? []).map((s) => s.sessions)));

  protected readonly chart: ApexChart = {
    type: 'area',
    height: 300,
    fontFamily: 'Inter, sans-serif',
    toolbar: { show: false },
    zoom: { enabled: false }
  };
  protected readonly colors = ['#006da4', '#94a3b8'];
  protected readonly stroke: ApexStroke = { curve: 'smooth', width: 2.5 };
  protected readonly grid: ApexGrid = { borderColor: '#f1f2f4', strokeDashArray: 4 };
  protected readonly dataLabels: ApexDataLabels = { enabled: false };

  protected readonly series = computed<ApexAxisChartSeries>(() => [
    { name: 'Visiteurs', data: (this.data()?.byDay ?? []).map((day) => day.users) },
    { name: 'Visites', data: (this.data()?.byDay ?? []).map((day) => day.sessions) }
  ]);
  protected readonly axis = computed<ApexXAxis>(() => ({
    categories: (this.data()?.byDay ?? []).map((day) =>
      new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(day.date))
    ),
    labels: { rotate: -35, hideOverlappingLabels: true },
    axisBorder: { show: false },
    axisTicks: { show: false }
  }));

  /** GA reports seconds; "2 min 30 s" reads better on a dashboard. */
  protected duration(seconds: number): string {
    const total = Math.round(seconds);
    if (total < 60) return `${total} s`;
    return `${Math.floor(total / 60)} min ${String(total % 60).padStart(2, '0')} s`;
  }
}
