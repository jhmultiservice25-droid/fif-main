import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, exhaustMap, map, of, pipe, switchMap, tap } from 'rxjs';
import {
  IApiError,
  IApiSuccess,
  IInnovatorProfile,
  IInnovatorProfilePayload,
  IProject,
  IProjectPayloadInput
} from '@/app/shared/interfaces';

interface IInnovatorMutationState {
  isSaving: boolean;
  error: string;
  revision: number;
  savedProjectId: string | null;
}

export interface ISaveProjectInput {
  id: string | null;
  payload: IProjectPayloadInput;
  video: { file: File; durationSeconds: number } | null;
  submit: boolean;
}

export const InnovatorStore = signalStore(
  withState<IInnovatorMutationState>({ isSaving: false, error: '', revision: 0, savedProjectId: null }),
  withProps(() => ({ _http: inject(HttpClient) })),
  withMethods(({ _http, revision, ...store }) => {
    const handleError = (error: HttpErrorResponse) => {
      const apiError = error.error as IApiError | undefined;
      patchState(store, {
        isSaving: false,
        error: apiError?.message ?? 'L’enregistrement a échoué.'
      });
      return of(null);
    };

    const bumpRevision = (): void => {
      patchState(store, { isSaving: false, revision: revision() + 1 });
    };

    return {
      saveProfile: rxMethod<IInnovatorProfilePayload>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: '' })),
          exhaustMap((payload) =>
            _http.patch<IApiSuccess<IInnovatorProfile>>('/me/innovator', payload).pipe(
              tap(() => bumpRevision()),
              catchError(handleError)
            )
          )
        )
      ),

      /**
       * Saves the project, then uploads the pitch video and submits it when asked — one action for the user.
       * The created id is kept so a retry after a failed upload updates the draft instead of duplicating it.
       */
      saveProject: rxMethod<ISaveProjectInput>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: '' })),
          exhaustMap(({ id, payload, video, submit }) => {
            const projectId = id ?? store.savedProjectId();
            const save$ = projectId
              ? _http.patch<IApiSuccess<IProject>>(`/me/projects/${encodeURIComponent(projectId)}`, payload)
              : _http.post<IApiSuccess<IProject>>('/me/projects', payload);

            return save$.pipe(
              tap(({ data }) => patchState(store, { savedProjectId: data.id })),
              switchMap(({ data }) => {
                if (!video) return of(data.id);
                const formData = new FormData();
                formData.append('video', video.file);
                return _http
                  .post(`/me/projects/${encodeURIComponent(data.id)}/pitch-video`, formData, {
                    headers: { 'X-Video-Duration-Seconds': String(video.durationSeconds) }
                  })
                  .pipe(map(() => data.id));
              }),
              switchMap((savedId) =>
                submit
                  ? _http.patch(`/me/projects/${encodeURIComponent(savedId)}`, { status: 'SUBMITTED' })
                  : of(null)
              ),
              tap(() => bumpRevision()),
              catchError(handleError)
            );
          })
        )
      ),
      clearError(): void {
        patchState(store, { error: '' });
      }
    };
  })
);
