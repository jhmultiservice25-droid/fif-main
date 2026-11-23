import { inject, Injectable, Injector } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { IRegistrationDialogData } from './registration-dialog/registration-dialog';

/**
 * Opens the registration modal. The dialog, its overlay code and the OTP flow are loaded on first use
 * only, so the home page bundle stays light (PRD-001 §7).
 */
@Injectable({ providedIn: 'root' })
export class RegistrationLauncher {
  private readonly injector = inject(Injector);

  /** Resolves when the modal closes, so callers can refresh what changed. */
  async open(data: IRegistrationDialogData = {}): Promise<void> {
    const [{ MatDialog }, { RegistrationDialog }] = await Promise.all([
      import('@angular/material/dialog'),
      import('./registration-dialog/registration-dialog')
    ]);
    const dialog = this.injector.get(MatDialog);
    if (dialog.getDialogById('fif-registration')) return;
    const ref = dialog.open(RegistrationDialog, {
      id: 'fif-registration',
      data,
      disableClose: true,
      autoFocus: false,
      width: '720px',
      maxWidth: '100vw',
      panelClass: 'fif-registration-panel'
    });
    await firstValueFrom(ref.afterClosed());
  }
}
