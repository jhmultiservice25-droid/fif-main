import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IAdminStats } from '@/app/shared/interfaces';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent
} from 'ng-apexcharts';
import { ISummaryItem } from '../interfaces';
import { FestivalChrome } from '../../../core/festival';
import { COMMITTEE_STATUS_LABELS, VOLUNTEER_STATUS_LABELS } from '../data';

@Component({
  templateUrl: './stats.html',
  imports: [ChartComponent, DecimalPipe, MatButtonModule, MatIconModule, RouterLink]
})
export default class Stats {
  readonly statsResource = httpResource<{ data: IAdminStats }>(() => '/admin/stats');

  readonly areaChart: ApexChart = {
    type: 'area',
    height: 320,
    fontFamily: 'Inter, sans-serif',
    toolbar: { show: false },
    zoom: { enabled: false }
  };
  readonly donutChart: ApexChart = {
    type: 'donut',
    height: 300,
    fontFamily: 'Inter, sans-serif'
  };
  readonly barChart: ApexChart = {
    type: 'bar',
    height: 340,
    fontFamily: 'Inter, sans-serif',
    toolbar: { show: false }
  };
  readonly colors = ['#006da4', '#f59e0b'];
  readonly jobColors = [this.colors[0]];
  readonly teamColors = [this.colors[1]];
  readonly committeeStatusColors = ['#2563eb', '#7c3aed', '#f59e0b', '#16a34a', '#dc2626'];
  readonly volunteerStatusColors = ['#2563eb', '#7c3aed', '#16a34a', '#f59e0b', '#dc2626', '#0891b2', '#4f46e5'];
  readonly chartStroke: ApexStroke = { curve: 'smooth', width: 3 };
  readonly chartGrid: ApexGrid = { borderColor: '#f1f2f4', strokeDashArray: 4 };
  readonly chartLegend: ApexLegend = { position: 'bottom', fontSize: '12px' };
  readonly chartTooltip: ApexTooltip = { shared: true, intersect: false };
  readonly chartDataLabels: ApexDataLabels = { enabled: false };
  readonly donutPlotOptions: ApexPlotOptions = {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          total: { show: true, label: 'Total' }
        }
      }
    }
  };
  readonly barPlotOptions: ApexPlotOptions = {
    bar: { horizontal: true, borderRadius: 4, barHeight: '60%' }
  };
  readonly countAxis: ApexYAxis = {
    min: 0,
    forceNiceScale: true,
    labels: { formatter: (value) => Math.round(value).toLocaleString('fr-FR') }
  };

  protected readonly chrome = inject(FestivalChrome);
  protected readonly festivalLabel = this.chrome.label;
  protected readonly status = this.chrome.status;

  protected readonly quickActions = [
    { label: 'Scanner un badge', hint: 'Contrôle d’accès', icon: 'scan-line', route: '/checkin' },
    { label: 'Diffuser un e-mail', hint: 'Participants, speakers…', icon: 'megaphone', route: '/diffusion' },
    { label: 'Ajouter un speaker', hint: 'Programme public', icon: 'user-plus', route: '/speakers/nouveau' },
    { label: 'Traiter les candidatures', hint: 'Comité et volontaires', icon: 'files', route: '/applications' }
  ];

  readonly summary = computed<ISummaryItem[]>(() => {
    if (!this.statsResource.hasValue()) {
      return [];
    }

    const stats = this.statsResource.value().data;

    return [
      {
        title: 'Participants',
        description: 'Inscriptions grand public',
        icon: 'ticket',
        value: stats.participantTotal,
        route: '/participants',
        tone: 'bg-primary-50 text-primary-700'
      },
      {
        title: 'Innovateurs',
        description: 'Comptes innovateur',
        icon: 'lightbulb',
        value: stats.innovatorTotal,
        route: '/projets',
        tone: 'bg-amber-50 text-amber-700'
      },
      {
        title: 'Organisations',
        description: 'Comptes organisation',
        icon: 'building-2',
        value: stats.organizationTotal,
        route: '/besoins',
        tone: 'bg-emerald-50 text-emerald-700'
      },
      {
        title: 'Candidatures',
        description: `${stats.committeeTotal} comité · ${stats.volunteerTotal} volontaires`,
        icon: 'files',
        value: stats.committeeTotal + stats.volunteerTotal,
        route: '/applications',
        tone: 'bg-violet-50 text-violet-700'
      }
    ];
  });

  readonly weekEvolution = computed(() => {
    if (!this.statsResource.hasValue()) {
      return null;
    }

    const { lastWeek, thisWeek } = this.statsResource.value().data;

    if (lastWeek === 0) {
      return thisWeek === 0 ? 0 : null;
    }

    return ((thisWeek - lastWeek) / lastWeek) * 100;
  });

  readonly activitySeries = computed<ApexAxisChartSeries>(() => {
    const days = this.statsResource.hasValue()
      ? [...this.statsResource.value().data.byDay].sort((first, second) => first.date.localeCompare(second.date))
      : [];

    return [
      { name: 'Comité', data: days.map((day) => day.committee) },
      { name: 'Volontaires', data: days.map((day) => day.volunteer) }
    ];
  });

  readonly activityAxis = computed<ApexXAxis>(() => ({
    categories: this.statsResource.hasValue()
      ? [...this.statsResource.value().data.byDay]
          .sort((first, second) => first.date.localeCompare(second.date))
          .map((day) => this.formatDate(day.date))
      : [],
    labels: { rotate: -35, hideOverlappingLabels: true },
    axisBorder: { show: false },
    axisTicks: { show: false }
  }));

  readonly committeeStatusSeries = computed<ApexNonAxisChartSeries>(() => {
    if (!this.statsResource.hasValue()) {
      return [];
    }

    const status = this.statsResource.value().data.committeeByStatus;
    return [status.RECEIVED, status.SHORTLISTED, status.INTERVIEW, status.SELECTED, status.REJECTED];
  });

  readonly volunteerStatusSeries = computed<ApexNonAxisChartSeries>(() => {
    if (!this.statsResource.hasValue()) {
      return [];
    }

    const status = this.statsResource.value().data.volunteerByStatus;
    return [
      status.RECEIVED,
      status.SHORTLISTED,
      status.SELECTED,
      status.WAITLIST,
      status.REJECTED,
      status.ASSIGNED,
      status.TRAINED
    ];
  });

  readonly committeeStatusLabels = COMMITTEE_STATUS_LABELS;
  readonly volunteerStatusLabels = VOLUNTEER_STATUS_LABELS;

  readonly jobSeries = computed<ApexAxisChartSeries>(() => [
    {
      name: 'Candidatures',
      data: this.statsResource.hasValue()
        ? [...this.statsResource.value().data.committeeByJob]
            .sort((first, second) => second.count - first.count)
            .slice(0, 8)
            .map((job) => job.count)
        : []
    }
  ]);

  readonly jobAxis = computed<ApexXAxis>(() => ({
    categories: this.statsResource.hasValue()
      ? [...this.statsResource.value().data.committeeByJob]
          .sort((first, second) => second.count - first.count)
          .slice(0, 8)
          .map((job) => job.title)
      : [],
    labels: { formatter: (value) => Math.round(Number(value)).toLocaleString('fr-FR') }
  }));

  readonly teamSeries = computed<ApexAxisChartSeries>(() => [
    {
      name: 'Candidatures',
      data: this.statsResource.hasValue()
        ? [...this.statsResource.value().data.volunteerByTeam]
            .sort((first, second) => second.count - first.count)
            .map((team) => team.count)
        : []
    }
  ]);

  readonly teamAxis = computed<ApexXAxis>(() => ({
    categories: this.statsResource.hasValue()
      ? [...this.statsResource.value().data.volunteerByTeam]
          .sort((first, second) => second.count - first.count)
          .map((team) => team.name)
      : [],
    labels: { formatter: (value) => Math.round(Number(value)).toLocaleString('fr-FR') }
  }));

  private formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date);
  }
}
