import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { IApiSuccess, ICataloguePage, ICatalogueProject, ICatalogueSolution } from '@/app/shared/interfaces';

/** /projets — public catalogue for donors, institutions, companies and partners (PRD-003 §6). */
@Component({
  imports: [MatIconModule, RouterLink],
  templateUrl: './catalogue.html'
})
export default class Catalogue {
  readonly tab = input<string | undefined>();
  private readonly router = inject(Router);

  protected readonly search = signal('');
  protected readonly sector = signal('');
  protected readonly page = signal(1);
  protected readonly activeTab = computed(() => (this.tab() === 'projets' ? 'projets' : 'solutions'));

  private readonly query = computed(() => {
    const params = new URLSearchParams();
    if (this.search().trim()) params.set('search', this.search().trim());
    if (this.sector()) params.set('sector', this.sector());
    params.set('page', String(this.page()));
    return params.toString();
  });

  protected readonly solutionsResource = httpResource<IApiSuccess<ICataloguePage<ICatalogueSolution>>>(() =>
    this.activeTab() === 'solutions' ? `/catalogue/solutions?${this.query()}` : undefined
  );
  protected readonly projectsResource = httpResource<IApiSuccess<ICataloguePage<ICatalogueProject>>>(() =>
    this.activeTab() === 'projets' ? `/catalogue/projects?${this.query()}` : undefined
  );

  protected readonly current = computed<{ total: number; pageSize: number } | null>(() => {
    if (this.activeTab() === 'solutions') {
      return this.solutionsResource.hasValue() ? this.solutionsResource.value().data : null;
    }
    return this.projectsResource.hasValue() ? this.projectsResource.value().data : null;
  });
  protected readonly loading = computed(() =>
    this.activeTab() === 'solutions' ? this.solutionsResource.isLoading() : this.projectsResource.isLoading()
  );
  protected readonly sectors = computed(() =>
    this.solutionsResource.hasValue() ? (this.solutionsResource.value().data.sectors ?? []) : []
  );
  protected readonly pages = computed(() => {
    const data = this.current();
    return data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  });

  protected readonly solutionItems = computed(() =>
    this.solutionsResource.hasValue() ? this.solutionsResource.value().data.items : []
  );
  protected readonly projectItems = computed(() =>
    this.projectsResource.hasValue() ? this.projectsResource.value().data.items : []
  );

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected setTab(tab: 'solutions' | 'projets'): void {
    this.page.set(1);
    this.sector.set('');
    void this.router.navigate([], { queryParams: { tab: tab === 'solutions' ? null : tab }, replaceUrl: true });
  }

  protected onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.search.set(value);
    }, 300);
  }

  protected setSector(sector: string): void {
    this.page.set(1);
    this.sector.set(this.sector() === sector ? '' : sector);
  }
}
