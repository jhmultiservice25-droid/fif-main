import { ISex } from '@/app/shared/interfaces';

export interface IApplicantIdentityForm {
  lastName: string;
  postnom: string;
  firstName: string;
  sex: ISex | '';
  birthDate: Date;
  city: string;
  whatsapp: string;
  email: string;
}

export interface ICommitteeApplicationForm {
  identity: IApplicantIdentityForm;
  primaryJobId: string;
  secondaryJobId: string;
  motivation: string;
}

export interface IVolunteerApplicationForm {
  identity: IApplicantIdentityForm;
  primaryTeamId: string;
  secondaryTeamId: string;
  motivation: string;
}
