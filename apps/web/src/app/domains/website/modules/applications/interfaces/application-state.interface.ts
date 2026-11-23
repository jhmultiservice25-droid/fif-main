import { IParticipantRegistration } from '@/app/shared/interfaces';

export interface IApplicationState {
  isLoading: boolean;
  isSubmitted: boolean;
  isAlreadyApplied: boolean;
  error: string;
  participant: IParticipantRegistration | null;
}
