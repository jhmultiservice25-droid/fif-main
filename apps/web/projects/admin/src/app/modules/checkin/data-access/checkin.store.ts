import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, exhaustMap, of, pipe, tap } from 'rxjs';
import { IApiError, IApiSuccess, ICheckInResult, IEventPass, IResendEmailResult } from '@/app/shared/interfaces';

interface ICheckInState {
  isLoading: boolean;
  isSendingEmail: boolean;
  error: string;
  current: IEventPass | null;
  lastEmailSent: boolean | null;
  revision: number;
}

const initialState: ICheckInState = {
  isLoading: false,
  isSendingEmail: false,
  error: '',
  current: null,
  lastEmailSent: null,
  revision: 0
};

export const CheckInStore = signalStore(
  withState(initialState),
  withProps(() => ({ _http: inject(HttpClient) })),
  withMethods(({ _http, revision, ...store }) => {
    const handleError = (error: HttpErrorResponse) => {
      const apiError = error.error as IApiError | undefined;
      patchState(store, { isLoading: false, current: null, error: apiError?.message ?? 'Code invalide.' });
      return of(null);
    };

    return {
      lookup: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: '', current: null })),
          exhaustMap((token) =>
            _http.get<IApiSuccess<IEventPass>>(`/admin/checkin/${encodeURIComponent(token)}`).pipe(
              tap((res) => patchState(store, { isLoading: false, current: res.data })),
              catchError(handleError)
            )
          )
        )
      ),
      confirm: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: '' })),
          exhaustMap((token) =>
            _http.patch<IApiSuccess<ICheckInResult>>(`/admin/checkin/${encodeURIComponent(token)}/confirm`, {}).pipe(
              tap((res) =>
                patchState(store, { isLoading: false, current: res.data, revision: revision() + 1 })
              ),
              catchError(handleError)
            )
          )
        )
      ),
      resendEmail: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isSendingEmail: true, error: '', lastEmailSent: null })),
          exhaustMap((token) =>
            _http
              .patch<IApiSuccess<IResendEmailResult>>(`/admin/checkin/${encodeURIComponent(token)}/resend-email`, {})
              .pipe(
                tap((res) =>
                  patchState(store, { isSendingEmail: false, current: res.data, lastEmailSent: res.data.emailSent })
                ),
                catchError((error: HttpErrorResponse) => {
                  const apiError = error.error as IApiError | undefined;
                  patchState(store, {
                    isSendingEmail: false,
                    error: apiError?.message ?? "L'envoi a échoué."
                  });
                  return of(null);
                })
              )
          )
        )
      ),
      reset(): void {
        patchState(store, { current: null, error: '', lastEmailSent: null });
      }
    };
  })
);
