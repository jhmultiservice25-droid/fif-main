import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { IApiError, IApiSuccess } from '@/app/shared/interfaces';
import {
  IAdminSession,
  IAttendee,
  IConflict,
  IProgrammeOverview,
  IRequestGroup,
  IRoom,
  ISessionChangeEntry,
  ISessionInput
} from '../interfaces/programme-admin.interface';

/** Error raised by the API, with the conflict list of a 409 when there is one. */
export class ProgrammeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly conflicts: IConflict[] = []
  ) {
    super(message);
  }
}

const BASE = '/admin/programme';

@Injectable({ providedIn: 'root' })
export class ProgrammeAdminApi {
  private readonly http = inject(HttpClient);

  overview() {
    return this.call(this.http.get<IApiSuccess<IProgrammeOverview>>(BASE));
  }

  check(input: ISessionInput, id?: string) {
    return this.call(this.http.post<IApiSuccess<{ conflicts: IConflict[] }>>(`${BASE}/sessions/check`, { ...input, id }));
  }

  create(input: ISessionInput) {
    return this.call(this.http.post<IApiSuccess<IAdminSession>>(`${BASE}/sessions`, input));
  }

  update(id: string, input: ISessionInput) {
    return this.call(this.http.patch<IApiSuccess<IAdminSession>>(`${BASE}/sessions/${id}`, input));
  }

  cancel(id: string, reason: string) {
    return this.call(this.http.post<IApiSuccess<IAdminSession>>(`${BASE}/sessions/${id}/cancel`, { reason }));
  }

  restore(id: string) {
    return this.call(this.http.post<IApiSuccess<IAdminSession>>(`${BASE}/sessions/${id}/restore`, {}));
  }

  duplicate(id: string) {
    return this.call(this.http.post<IApiSuccess<IAdminSession>>(`${BASE}/sessions/${id}/duplicate`, {}));
  }

  remove(id: string) {
    return this.call(this.http.delete<IApiSuccess<{ deleted: boolean }>>(`${BASE}/sessions/${id}`));
  }

  history(id: string) {
    return this.call(this.http.get<IApiSuccess<ISessionChangeEntry[]>>(`${BASE}/sessions/${id}/history`));
  }

  attendees(id: string) {
    return this.call(this.http.get<IApiSuccess<IAttendee[]>>(`${BASE}/sessions/${id}/attendees`));
  }

  addAttendee(id: string, email: string) {
    return this.call(this.http.post<IApiSuccess<IAttendee[]>>(`${BASE}/sessions/${id}/attendees`, { email }));
  }

  removeAttendee(id: string, userId: string) {
    return this.call(this.http.delete<IApiSuccess<IAttendee[]>>(`${BASE}/sessions/${id}/attendees/${userId}`));
  }

  async downloadAttendees(id: string, filename: string) {
    const file = await firstValueFrom(this.http.get(`${BASE}/sessions/${id}/attendees.csv`, { responseType: 'blob' }));
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  requests() {
    return this.call(this.http.get<IApiSuccess<{ total: number; groups: IRequestGroup[] }>>(`${BASE}/requests`));
  }

  decide(registrationIds: string[], decision: 'APPROVE' | 'DECLINE', note?: string) {
    return this.call(
      this.http.post<IApiSuccess<{ approved: number; waitlisted: number; declined: number }>>(`${BASE}/requests/decide`, {
        registrationIds,
        decision,
        note
      })
    );
  }

  rooms() {
    return this.call(this.http.get<IApiSuccess<IRoom[]>>(`${BASE}/rooms`));
  }

  saveRoom(room: Partial<IRoom> & { name: string }) {
    const body = { name: room.name, capacity: room.capacity ?? null, color: room.color, order: room.order };
    return this.call(
      room.id
        ? this.http.patch<IApiSuccess<IRoom>>(`${BASE}/rooms/${room.id}`, body)
        : this.http.post<IApiSuccess<IRoom>>(`${BASE}/rooms`, body)
    );
  }

  removeRoom(id: string) {
    return this.call(this.http.delete<IApiSuccess<{ deleted: boolean }>>(`${BASE}/rooms/${id}`));
  }

  private async call<T>(request: Observable<IApiSuccess<T>>): Promise<T> {
    try {
      return (await firstValueFrom(request)).data;
    } catch (error) {
      const response = error as HttpErrorResponse;
      const body = response.error as (IApiError & { code?: string; conflicts?: IConflict[] }) | undefined;
      throw new ProgrammeApiError(body?.message ?? 'Action impossible pour le moment.', response.status, body?.code, body?.conflicts ?? []);
    }
  }
}
