import { httpResource } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { IApiSuccess } from '@/app/shared/interfaces';
import { environment } from '@/environments/environment';

interface IHackademyApplication {
  id: string;
  university: string;
  city: string;
  teamName: string;
  teamLeader: string;
  whatsapp: string;
  email: string;
  memberNames: string[];
  logoPath: string;
  createdAt: string;
}
interface IPage {
  items: IHackademyApplication[];
  total: number;
  page: number;
  pageSize: number;
}

@Component({
  templateUrl: './hackademy-applications.html',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatPaginatorModule, MatTableModule]
})
export default class HackademyApplications {
  protected readonly apiUrl = environment.apiUrl;
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly displayedColumns = ['team', 'institution', 'leader', 'members', 'submitted'];
  protected readonly resource = httpResource<IApiSuccess<IPage>>(() =>
    `/admin/hackademy-ctf/applications?page=${this.page()}&pageSize=${this.pageSize()}`
  );
  protected readonly applications = computed(() => this.resource.value()?.data.items ?? []);
  protected readonly total = computed(() => this.resource.value()?.data.total ?? 0);

  protected changePage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-CD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }
}
