import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IMessageType } from '@/app/shared/interfaces';
import { IToastData, ToastView } from './toast-view';

const DURATIONS: Record<IMessageType, number> = {
  success: 4000,
  warning: 5000,
  error: 6000
};

@Injectable({ providedIn: 'root' })
export class Toast {
  private readonly snackBar = inject(MatSnackBar);

  show(type: IMessageType, message: string, title?: string): void {
    this.snackBar.openFromComponent<ToastView, IToastData>(ToastView, {
      data: { type, message, title },
      duration: DURATIONS[type],
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['toast-panel']
    });
  }

  success(message: string, title?: string): void {
    this.show('success', message, title);
  }

  error(message: string, title?: string): void {
    this.show('error', message, title);
  }

  warning(message: string, title?: string): void {
    this.show('warning', message, title);
  }
}
