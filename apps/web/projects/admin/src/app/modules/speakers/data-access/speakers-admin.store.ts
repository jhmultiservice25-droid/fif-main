import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, exhaustMap, of, pipe, tap } from 'rxjs';
import { IApiError, IApiSuccess, ISpeaker, ISpeakerPayload } from '@/app/shared/interfaces';

interface ISpeakersAdminState {
  isSaving: boolean;
  error: string;
  revision: number;
}

const initialState: ISpeakersAdminState = { isSaving: false, error: '', revision: 0 };

export const SpeakersAdminStore = signalStore(
  withState(initialState),
  withProps(() => ({ _http: inject(HttpClient) })),
  withMethods(({ _http, revision, ...store }) => {
    const handleError = (error: HttpErrorResponse) => {
      const apiError = error.error as IApiError | undefined;
      patchState(store, { isSaving: false, error: apiError?.message ?? "L'opération a échoué." });
      return of(null);
    };

    return {
      create: rxMethod<{ payload: ISpeakerPayload; photo: File | null }>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: '' })),
          exhaustMap(({ payload, photo }) => {
            const formData = new FormData();
            if (payload.name) formData.append('name', payload.name);
            if (payload.title) formData.append('title', payload.title);
            if (payload.bio) formData.append('bio', payload.bio);
            if (payload.email) formData.append('email', payload.email);
            for (const day of payload.days ?? []) formData.append('days', day);
            if (payload.order !== undefined) formData.append('order', String(payload.order));
            if (photo) formData.append('photo', photo);

            return _http.post<IApiSuccess<ISpeaker>>('/admin/speakers', formData).pipe(
              tap(() => patchState(store, { isSaving: false, revision: revision() + 1 })),
              catchError(handleError)
            );
          })
        )
      ),
      update: rxMethod<{ id: string; payload: ISpeakerPayload }>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: '' })),
          exhaustMap(({ id, payload }) =>
            _http.patch<IApiSuccess<ISpeaker>>(`/admin/speakers/${encodeURIComponent(id)}`, payload).pipe(
              tap(() => patchState(store, { isSaving: false, revision: revision() + 1 })),
              catchError(handleError)
            )
          )
        )
      ),
      uploadPhoto: rxMethod<{ id: string; file: File }>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: '' })),
          exhaustMap(({ id, file }) => {
            const formData = new FormData();
            formData.append('photo', file);
            return _http.post<IApiSuccess<ISpeaker>>(`/admin/speakers/${encodeURIComponent(id)}/photo`, formData).pipe(
              tap(() => patchState(store, { isSaving: false, revision: revision() + 1 })),
              catchError(handleError)
            );
          })
        )
      ),
      remove: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: '' })),
          exhaustMap((id) =>
            _http.delete<IApiSuccess<null>>(`/admin/speakers/${encodeURIComponent(id)}`).pipe(
              tap(() => patchState(store, { isSaving: false, revision: revision() + 1 })),
              catchError(handleError)
            )
          )
        )
      ),
      clearError(): void {
        patchState(store, { error: '' });
      }
    };
  })
);
