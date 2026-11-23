export interface IAdminShowcaseSettings {
  pickerOpen: boolean;
  deadline: string | null;
  maxPerInnovator: number;
  maxPerSolution: number;
  demoShowSessionIds: string[];
}

export interface IAdminPresenter {
  userId: string;
  name: string;
  email: string;
  listedPublicly: boolean;
  assignedByAdmin: boolean;
  pickedAt: string;
}

export interface IAdminSolution {
  id: string;
  reference: string;
  name: string;
  summary: string;
  sector: string;
  city: string;
  teamName: string;
  contactEmail: string | null;
  website: string | null;
  active: boolean;
  presenters: IAdminPresenter[];
}

export interface IAdminShowcase {
  settings: IAdminShowcaseSettings;
  sectors: string[];
  coverage: { active: number; covered: number; full: number; presenters: number };
  solutions: IAdminSolution[];
}

export interface IImportPreview {
  token: string;
  create: number;
  update: number;
  deactivate: { id: string; reference: string; name: string; presenters: number }[];
  errors: { line: number; message: string }[];
  sample: { reference: string; name: string; sector: string; city: string }[];
}

export interface IContactMessageRow {
  id: string;
  targetType: 'SOLUTION' | 'PROJECT';
  targetName: string;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  senderOrganization: string;
  senderType: string;
  message: string;
  deliveredAt: string | null;
  createdAt: string;
}
