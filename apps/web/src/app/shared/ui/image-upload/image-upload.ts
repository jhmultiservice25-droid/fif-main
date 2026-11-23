import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Toast } from '@/app/core/toast';
import { apiAssetUrl } from '@/app/shared/helpers';
import { IApiError } from '@/app/shared/interfaces';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/** Avatar/logo picker that uploads as soon as a file is chosen, independently of the surrounding form. */
@Component({
  selector: 'app-image-upload',
  imports: [MatIconModule],
  template: `
    <div class="flex items-center gap-5">
      <div
        class="relative flex size-20 shrink-0 items-center justify-center overflow-hidden bg-primary-50 text-xl font-semibold text-primary-700"
        [class]="shape() === 'circle' ? 'rounded-full' : 'rounded-2xl'">
        @if (displayUrl(); as url) {
          <img class="size-full object-cover" alt="" [src]="url" />
        } @else {
          {{ fallback() }}
        }
        @if (isUploading()) {
          <div class="absolute inset-0 flex items-center justify-center bg-white/70">
            <mat-icon class="animate-spin text-primary-700" svgIcon="loader-circle" />
          </div>
        }
      </div>
      <div>
        <label
          class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-gray-300 px-4 text-sm font-medium text-gray-950 transition-colors hover:bg-gray-50 has-focus-visible:ring-2 has-focus-visible:ring-primary-600"
          [class.pointer-events-none]="isUploading()"
          [class.opacity-60]="isUploading()">
          <mat-icon class="size-4" svgIcon="upload" />
          {{ imageUrl() ? 'Changer l’image' : 'Importer une image' }}
          <input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" (change)="onSelected($event)" />
        </label>
        <p class="mt-2 text-xs text-neutral-500">JPG, PNG ou WebP · 5 Mo maximum</p>
      </div>
    </div>
  `
})
export class ImageUpload {
  /** API path that accepts the multipart upload, e.g. `/me/innovator/photo`. */
  readonly endpoint = input.required<string>();
  /** Multipart field name expected by the endpoint. */
  readonly field = input.required<string>();
  readonly imageUrl = input<string | null | undefined>(null);
  readonly fallback = input('');
  readonly shape = input<'circle' | 'rounded'>('circle');
  readonly uploaded = output<void>();

  private readonly http = inject(HttpClient);
  private readonly toast = inject(Toast);

  protected readonly isUploading = signal(false);
  private readonly previewUrl = signal<string | null>(null);
  protected readonly displayUrl = computed(() => this.previewUrl() ?? apiAssetUrl(this.imageUrl()));

  protected onSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      this.toast.error('Choisissez une image JPG, PNG ou WebP.', 'Format non pris en charge');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.toast.error('L’image ne doit pas dépasser 5 Mo.', 'Image trop lourde');
      return;
    }

    const formData = new FormData();
    formData.append(this.field(), file);
    this.isUploading.set(true);
    this.http.post(this.endpoint(), formData).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.previewUrl.set(URL.createObjectURL(file));
        this.toast.success('Image mise à jour.');
        this.uploaded.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.isUploading.set(false);
        const apiError = error.error as IApiError | undefined;
        this.toast.error(apiError?.message ?? 'L’envoi de l’image a échoué.', 'Envoi impossible');
      }
    });
  }
}
