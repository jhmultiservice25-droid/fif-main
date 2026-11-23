export interface IShowcaseSettingsPublic {
  pickerOpen: boolean;
  deadline: string | null;
  closed: boolean;
  maxPerInnovator: number;
  maxPerSolution: number;
}

export interface IShowcaseSolutionChoice {
  id: string;
  reference: string;
  name: string;
  summary: string;
  sector: string;
  city: string;
  teamName: string;
  presenters: number;
  placesLeft: number;
  mine: boolean;
}

export interface IShowcasePick {
  solutionId: string;
  reference: string;
  name: string;
  listedPublicly: boolean;
  pickedAt: string;
}

export interface IInnovatorShowcase {
  settings: IShowcaseSettingsPublic;
  picks: IShowcasePick[];
  sectors: string[];
  solutions: IShowcaseSolutionChoice[];
}

export interface ICatalogueSolution {
  reference: string;
  name: string;
  summary: string;
  sector: string;
  city: string;
  teamName: string;
  presentedAtFestival: boolean;
  website?: string | null;
  presenters?: string[];
}

export interface ICatalogueProject {
  id: string;
  title: string;
  summary: string;
  sectors: string[];
  stage: string;
  city: string;
  owner: string | null;
  anonymous: boolean;
  problemSolved?: string;
  solution?: string;
  capabilities?: string[];
}

export interface ICataloguePage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  sectors?: string[];
}

export interface IPartnerMessage {
  id: string;
  targetName: string;
  senderName: string;
  senderOrganization: string;
  senderType: string;
  senderEmail: string;
  message: string;
  createdAt: string;
}
