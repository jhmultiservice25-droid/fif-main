export type IUserRole = 'ORGANIZATION' | 'INNOVATOR' | 'PARTICIPANT' | 'ADMIN' | 'USER';

export type IRecordStatus = 'DRAFT' | 'SUBMITTED';

export type IPublicationConsent = 'NAMED' | 'ANONYMOUS' | 'NO' | 'DISCUSS';

export interface ICatalogOption {
  value: string;
  label?: string;
}

export type ICatalogItems = ICatalogOption[] | string[];

export interface IMarketplaceCatalog {
  orgTypes: ICatalogItems;
  sectors: ICatalogItems;
  problemDomains: ICatalogItems;
  solutionTypes: ICatalogItems;
  priorityLevels: ICatalogItems;
  timelines: ICatalogItems;
  yesMaybeNo: ICatalogItems;
  budgetBands: ICatalogItems;
  publicationConsents: ICatalogItems;
  fikiriChallenge: ICatalogItems;
  recordStatuses: ICatalogItems;
  projectStages: ICatalogItems;
  projectCapabilities: ICatalogItems;
  digitizationLevels: ICatalogItems;
}

export interface IOrganizationProfile {
  name: string;
  type: string;
  sector: string;
  city: string;
  contactName: string;
  contactTitle: string;
  phone: string;
  professionalEmail: string;
  logoUrl?: string | null;
}

export interface IOrganizationProfilePayload {
  name?: string;
  type?: string;
  sector?: string;
  city?: string;
  contactName?: string;
  contactTitle?: string;
  phone?: string;
  professionalEmail?: string;
}

export interface INeedPayload {
  digitizationLevel?: string;
  challengeDescription?: string;
  currentSituation?: string;
  expectedImpact?: string;
  successCriteria?: string;
  stakeholders?: string;
  constraints?: string;
  additionalInfo?: string;
  [key: string]: unknown;
}

export interface INeed {
  id: string;
  status: IRecordStatus;
  priorityChallenge: string;
  problemDomains: string[];
  solutionTypes: string[];
  priority: string;
  timeline: string;
  pilotWillingness: string;
  budgetBand: string;
  publicationConsent: IPublicationConsent;
  fikiriChallenge: string;
  payload: INeedPayload;
  createdAt: string;
  updatedAt: string;
}

export interface INeedPayloadInput {
  status?: IRecordStatus;
  priorityChallenge?: string;
  problemDomains?: string[];
  solutionTypes?: string[];
  priority?: string;
  timeline?: string;
  pilotWillingness?: string;
  budgetBand?: string;
  publicationConsent?: IPublicationConsent;
  fikiriChallenge?: string;
  payload?: INeedPayload;
}

export interface IInnovatorProfile {
  displayName: string;
  organization: string | null;
  city: string;
  phone: string;
  email: string;
  photoUrl?: string | null;
}

export interface IInnovatorProfilePayload {
  displayName?: string;
  organization?: string | null;
  city?: string;
  phone?: string;
  email?: string;
}

export interface IProject {
  id: string;
  status: IRecordStatus;
  title: string;
  problemSolved: string;
  solution: string;
  sectors: string[];
  capabilities: string[];
  stage: string;
  publicationConsent: IPublicationConsent;
  pitchVideoPath?: string | null;
  pitchVideoOriginalName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IProjectPayloadInput {
  status?: IRecordStatus;
  title?: string;
  problemSolved?: string;
  solution?: string;
  sectors?: string[];
  capabilities?: string[];
  stage?: string;
  publicationConsent?: IPublicationConsent;
}

export interface IRegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface IRegisterResponse {
  id: string;
  email: string;
  name: string;
  role: IUserRole;
}

export interface IAdminNeedListItem {
  id: string;
  status: IRecordStatus;
  priorityChallenge: string;
  organization: { name: string };
  publicationConsent: IPublicationConsent;
  createdAt: string;
  updatedAt: string;
}

export interface IAdminInnovatorListItem {
  id: string;
  displayName: string;
  organization: string;
  city: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  projects: { title: string; status: string }[];
}

export interface IAdminProjectListItem {
  id: string;
  status: IRecordStatus;
  title: string;
  innovator: IInnovatorProfile;
  publicationConsent: IPublicationConsent;
  createdAt: string;
  updatedAt: string;
}

export interface IAdminListPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IAdminNeedDetail extends INeed {
  organizationId: string;
  organization: { name: string };
}

export interface IAdminProjectDetail extends IProject {
  innovatorId: string;
  innovator: IInnovatorProfile;
}

