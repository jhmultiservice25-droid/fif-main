import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  templateUrl: './hackademy-ctf.html',
  imports: [MatButtonModule, RouterLink]
})
export default class HackademyCtf {
  private readonly http = inject(HttpClient);
  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly registrationOpen = (() => { const now = new Date(); return now >= new Date("2026-12-10T00:00:00+01:00") && now <= new Date("2026-12-15T23:59:59+01:00"); })();

  protected submit(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const memberNames = [1, 2, 3, 4].map((n) => String(data.get(`member${n}`) ?? '').trim());
    data.delete('member1');
    data.delete('member2');
    data.delete('member3');
    data.delete('member4');
    data.set('memberNames', JSON.stringify(memberNames));
    this.loading.set(true);
    this.error.set('');
    this.http.post('/applications/hackademy-ctf', data).subscribe({
      next: () => {
        this.submitted.set(true);
        this.loading.set(false);
        form.reset();
      },
      error: (err: { error?: { message?: string | string[] } }) => {
        const message = err.error?.message;
        this.error.set(Array.isArray(message) ? message.join(' ') : message || "La candidature n'a pas pu être envoyée. Veuillez réessayer.");
        this.loading.set(false);
      }
    });
  }
}
