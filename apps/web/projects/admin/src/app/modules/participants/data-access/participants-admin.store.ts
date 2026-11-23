import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, concatMap, of, pipe, tap } from 'rxjs';
import { IApiError, IApiSuccess, IResendParticipantEmailResult } from '@/app/shared/interfaces';

interface IParticipantsAdminState {
  sendingId: string;
  error: string;
  lastEmailSent: boolean | null;
  revision: number;
}

const initialState: IParticipantsAdminState = { sendingId: '', error: '', lastEmailSent: null, revision: 0 };

export const ParticipantsAdminStore = signalStore(
  withState(initialState),
  withProps(() => ({ _http: inject(HttpClient) })),
  withMethods(({ _http, revision, ...store }) => ({
    resendEmail: rxMethod<string>(
      pipe(
        tap((id) => patchState(store, { sendingId: id, error: '', lastEmailSent: null })),
        concatMap((id) =>
          _http
            .patch<IApiSuccess<IResendParticipantEmailResult>>(
              `/admin/participants/${encodeURIComponent(id)}/resend-email`,
              {}
            )
            .pipe(
              tap((res) =>
                patchState(store, {
                  sendingId: '',
                  lastEmailSent: res.data.emailSent,
                  revision: revision() + 1
                })
              ),
              catchError((error: HttpErrorResponse) => {
                const apiError = error.error as IApiError | undefined;
                patchState(store, { sendingId: '', error: apiError?.message ?? "L'envoi a échoué." });
                return of(null);
              })
            )
        )
      )
    ),
    clearError(): void {
      patchState(store, { error: '' });
    }
  }))
);
