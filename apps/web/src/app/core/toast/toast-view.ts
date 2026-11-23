import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MESSAGE_STYLES } from '@/app/shared/data';
import { IMessageType } from '@/app/shared/interfaces';

export interface IToastData {
  type: IMessageType;
  message: string;
  title?: string;
}

@Component({
  selector: 'app-toast',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="flex items-start gap-3 rounded-xl border p-4 shadow-lg" [class]="styles.container">
      <span class="flex size-9 shrink-0 items-center justify-center rounded-lg" [class]="styles.iconContainer">
        <mat-icon class="size-5" [svgIcon]="styles.icon" />
      </span>
      <div class="min-w-0 flex-1 pt-0.5">
        @if (data.title) {
          <p class="font-semibold">{{ data.title }}</p>
        }
        <p class="text-sm" [class]="styles.message">{{ data.message }}</p>
      </div>
      <button
        class="-mt-1 -mr-1 shrink-0"
        [class]="styles.dismiss"
        matIconButton
        type="button"
        aria-label="Fermer"
        (click)="ref.dismiss()">
        <mat-icon class="size-4" svgIcon="x" />
      </button>
    </div>
  `
})
export class ToastView {
  protected readonly data = inject<IToastData>(MAT_SNACK_BAR_DATA);
  protected readonly ref = inject(MatSnackBarRef);
  protected readonly styles = MESSAGE_STYLES[this.data.type];
}
