import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { IAdminInnovatorListItem, IAdminListPage, IApiSuccess } from '@/app/shared/interfaces';

@Component({
  templateUrl: './innovator-list.html',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatPaginatorModule, MatTableModule]
})
export default class InnovatorList {
  private readonly http = inject(HttpClient);

  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly isExporting = signal(false);
  protected readonly exportError = signal('');
  protected readonly displayedColumns = ['innovator', 'email', 'phone', 'organization', 'city', 'projects', 'createdAt'];

  protected readonly innovatorsResource = httpResource<IApiSuccess<IAdminListPage<IAdminInnovatorListItem>>>(() =>
    `/admin/innovators?page=${this.page()}&pageSize=${this.pageSize()}`
  );

  protected readonly innovators = computed(() =>
    this.innovatorsResource.hasValue() ? this.innovatorsResource.value().data.items : []
  );

  protected readonly total = computed(() =>
    this.innovatorsResource.hasValue() ? this.innovatorsResource.value().data.total : 0
  );

  protected changePage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
  }

  protected projectTitles(projects: IAdminInnovatorListItem['projects']): string {
    return projects.map((project) => project.title).filter(Boolean).join(', ');
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-CD', { dateStyle: 'medium' }).format(new Date(value));
  }

  protected exportExcel(): void {
    if (this.isExporting()) return;
    this.isExporting.set(true);
    this.exportError.set('');

    this.http.get('/admin/innovators/export.xlsx', { responseType: 'blob' }).subscribe({
      next: (file) => {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'innovateurs-fif.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        this.isExporting.set(false);
      },
      error: () => {
        this.exportError.set("Le téléchargement a échoué. Vérifiez votre connexion et vos droits administrateur.");
        this.isExporting.set(false);
      }
    });
  }
}
