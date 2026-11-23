import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, exhaustMap, of, pipe, tap } from 'rxjs';
import { IApiError, IApiSuccess, IBroadcastPayload, IBroadcastResult } from '@/app/shared/interfaces';

interface IBroadcastState {
  isSending: boolean;
  error: string;
  result: IBroadcastResult | null;
}

const initialState: IBroadcastState = { isSending: false, error: '', result: null };

export const BroadcastStore = signalStore(
  withState(initialState),
  withProps(() => ({ _http: inject(HttpClient) })),
  withMethods(({ _http, ...store }) => ({
    send: rxMethod<IBroadcastPayload>(
      pipe(
        tap(() => patchState(store, { isSending: true, error: '', result: null })),
        exhaustMap((payload) =>
          _http.post<IApiSuccess<IBroadcastResult>>('/admin/broadcast', payload).pipe(
            tap((res) => patchState(store, { isSending: false, result: res.data })),
            catchError((error: HttpErrorResponse) => {
              const apiError = error.error as IApiError | undefined;
              patchState(store, { isSending: false, error: apiError?.message ?? "L'envoi a échoué." });
              return of(null);
            })
          )
        )
      )
    ),
    clear(): void {
      patchState(store, { error: '', result: null });
    }
  }))
);
