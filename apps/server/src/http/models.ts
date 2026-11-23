import {
  APPLICATION_KINDS,
  COMMITTEE_STATUSES,
  VOLUNTEER_STATUSES,
} from "../domain";
import type {
  CommitteeApplication,
  Job,
  Pole,
  StaffNotification,
  VolunteerApplication,
} from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const LIST_STATUSES = [...new Set([...COMMITTEE_STATUSES, ...VOLUNTEER_STATUSES])];

export class HealthData {
  @ApiProperty({ example: true })
  ok: boolean;

  @ApiProperty({ example: "fif-server" })
  service: string;
}

export class SessionUserData {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: "admin@fikiri.cd" })
  email: string;

  @ApiProperty({ example: "ADMIN" })
  role: string;

  @ApiPropertyOptional({ example: "FIF Admin" })
  name?: string;
}

export class OrganizationProfileResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  sector: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  contactName: string;

  @ApiProperty()
  contactTitle: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  professionalEmail: string;

  @ApiPropertyOptional({ nullable: true })
  logoUrl: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OrganizationNeedResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  priorityChallenge: string;

  @ApiProperty({ type: [String] })
  problemDomains: string[];

  @ApiProperty({ type: [String] })
  solutionTypes: string[];

  @ApiProperty()
  priority: string;

  @ApiProperty()
  timeline: string;

  @ApiProperty()
  pilotWillingness: string;

  @ApiProperty()
  budgetBand: string;

  @ApiProperty()
  publicationConsent: string;

  @ApiProperty()
  fikiriChallenge: string;

  @ApiProperty({ type: Object, additionalProperties: true })
  payload: object;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class InnovatorProfileResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  organization: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ nullable: true })
  photoUrl: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class InnovatorProjectResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  innovatorId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  problemSolved: string;

  @ApiProperty()
  solution: string;

  @ApiProperty({ type: [String] })
  sectors: string[];

  @ApiProperty({ type: [String] })
  capabilities: string[];

  @ApiProperty()
  stage: string;

  @ApiProperty()
  publicationConsent: string;

  @ApiPropertyOptional()
  pitchVideoPath?: string | null;

  @ApiPropertyOptional()
  pitchVideoOriginalName?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class NeedListPage {
  @ApiProperty({ type: [OrganizationNeedResponse] })
  items: OrganizationNeedResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class ProjectListPage {
  @ApiProperty({ type: [InnovatorProjectResponse] })
  items: InnovatorProjectResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class UserNotificationItem {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiPropertyOptional()
  href?: string;

  @ApiPropertyOptional()
  readAt?: string;

  @ApiProperty()
  createdAt: string;
}

export class UserNotificationListResponse {
  @ApiProperty()
  unread: number;

  @ApiProperty({ type: [UserNotificationItem] })
  items: UserNotificationItem[];
}

export class MarketplaceCatalogResponse {
  @ApiProperty({ type: [String] })
  orgTypes: string[];

  @ApiProperty({ type: [String] })
  sectors: string[];

  @ApiProperty({ type: [String] })
  problemDomains: string[];

  @ApiProperty({ type: [String] })
  solutionTypes: string[];

  @ApiProperty({ type: [String] })
  priorityLevels: string[];

  @ApiProperty({ type: [String] })
  timelines: string[];

  @ApiProperty({ type: [String] })
  yesMaybeNo: string[];

  @ApiProperty({ type: [String] })
  budgetBands: string[];

  @ApiProperty({ type: [String] })
  publicationConsents: string[];

  @ApiProperty({ type: [String] })
  fikiriChallenge: string[];

  @ApiProperty({ type: [String] })
  recordStatuses: string[];

  @ApiProperty({ type: [String] })
  projectStages: string[];

  @ApiProperty({ type: [String] })
  projectCapabilities: string[];

  @ApiProperty({ type: [String] })
  digitizationLevels: string[];
}

export class PoleResponse implements Pole {
  @ApiProperty({ example: "programme" })
  id: string;

  @ApiProperty({ example: "programme" })
  slug: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  shortName: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ example: 1 })
  order: number;
}

export class JobResponse implements Job {
  @ApiProperty({ example: "charge-programme" })
  id: string;

  @ApiProperty({ example: "charge-programme" })
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ example: "DEPUTY" })
  roleKind: string;

  @ApiProperty()
  mission: string;

  @ApiProperty({ type: [String] })
  responsibilities: string[];

  @ApiProperty({ type: [String] })
  profile: string[];

  @ApiProperty({ example: 2 })
  headcount: number;

  @ApiProperty({ example: "programme" })
  poleId: string;
}

export class JobWithPoleResponse extends JobResponse {
  @ApiProperty({ type: PoleResponse })
  pole: PoleResponse;
}

export class PoleWithJobsResponse extends PoleResponse {
  @ApiProperty({ type: [JobResponse] })
  jobs: JobResponse[];
}

type CommitteeApplicationResponse = Omit<
  CommitteeApplication,
  "birthDate" | "createdAt" | "updatedAt"
> & {
  birthDate: string;
  createdAt: string;
  updatedAt: string;
};

export class CommitteeApplicationRecord implements CommitteeApplicationResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  postnom: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty({ example: "FEMME" })
  sex: string;

  @ApiProperty({ type: String, format: "date-time" })
  birthDate: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  whatsapp: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  primaryJobId: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  secondaryJobId: string | null;

  @ApiProperty()
  motivation: string;

  @ApiProperty({ enum: COMMITTEE_STATUSES, example: "RECEIVED" })
  status: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: string;
}

type VolunteerApplicationResponse = Omit<
  VolunteerApplication,
  "birthDate" | "createdAt" | "updatedAt"
> & {
  birthDate: string;
  createdAt: string;
  updatedAt: string;
};

export class VolunteerApplicationRecord implements VolunteerApplicationResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  postnom: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty({ example: "HOMME" })
  sex: string;

  @ApiProperty({ type: String, format: "date-time" })
  birthDate: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  whatsapp: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ example: "accueil" })
  primaryTeamId: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  secondaryTeamId: string | null;

  @ApiProperty()
  motivation: string;

  @ApiProperty({ enum: VOLUNTEER_STATUSES, example: "RECEIVED" })
  status: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  assignmentTeamId: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  assignmentZone: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  assignmentLead: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  assignmentShift: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: string;
}

export class CommitteeApplicationDetail extends CommitteeApplicationRecord {
  @ApiProperty({ enum: ["COMMITTEE"] })
  kind: "COMMITTEE";

  @ApiProperty({ type: JobWithPoleResponse })
  primaryJob: JobWithPoleResponse;

  @ApiPropertyOptional({ nullable: true, type: JobResponse })
  secondaryJob: JobResponse | null;
}

export class VolunteerApplicationDetail extends VolunteerApplicationRecord {
  @ApiProperty({ enum: ["VOLUNTEER"] })
  kind: "VOLUNTEER";
}

export class ApplicationListItemResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: APPLICATION_KINDS })
  kind: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  whatsapp: string;

  @ApiProperty()
  city: string;

  @ApiProperty({ enum: LIST_STATUSES })
  status: string;

  @ApiProperty()
  primaryChoice: string;

  @ApiPropertyOptional()
  secondaryChoice?: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: string;
}

export class ApplicationListPage {
  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;

  @ApiProperty({ type: [ApplicationListItemResponse] })
  items: ApplicationListItemResponse[];
}

export class JobCountStat {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  poleId: string;

  @ApiProperty()
  count: number;
}

export class TeamCountStat {
  @ApiProperty()
  teamId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  count: number;
}

export class DayCountStat {
  @ApiProperty({ example: "2026-08-24" })
  date: string;

  @ApiProperty()
  committee: number;

  @ApiProperty()
  volunteer: number;
}

export class AdminStatsResponse {
  @ApiProperty()
  committeeTotal: number;

  @ApiProperty()
  volunteerTotal: number;

  @ApiProperty()
  organizationTotal: number;

  @ApiProperty()
  innovatorTotal: number;

  @ApiProperty()
  participantTotal: number;

  @ApiProperty({
    type: "object",
    additionalProperties: { type: "number" },
    description: "Compteurs par statut comité.",
  })
  committeeByStatus: Record<string, number>;

  @ApiProperty({
    type: "object",
    additionalProperties: { type: "number" },
    description: "Compteurs par statut volontaire.",
  })
  volunteerByStatus: Record<string, number>;

  @ApiProperty({ type: [JobCountStat] })
  committeeByJob: JobCountStat[];

  @ApiProperty({ type: [TeamCountStat] })
  volunteerByTeam: TeamCountStat[];

  @ApiProperty({ type: [DayCountStat] })
  byDay: DayCountStat[];

  @ApiProperty()
  thisWeek: number;

  @ApiProperty()
  lastWeek: number;
}

type StaffNotificationResponse = Omit<StaffNotification, "readAt" | "createdAt"> & {
  readAt: string | null;
  createdAt: string;
};

export class StaffNotificationItem implements StaffNotificationResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiPropertyOptional()
  href: string | null;

  @ApiPropertyOptional()
  readAt: string | null;

  @ApiProperty()
  createdAt: string;
}

export class NotificationListResponse {
  @ApiProperty()
  unread: number;

  @ApiProperty({ type: [StaffNotificationItem] })
  items: StaffNotificationItem[];
}

export class SpeakerResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  bio: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  photoUrl: string | null;

  @ApiProperty({ type: [String] })
  days: string[];

  @ApiProperty()
  order: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class AdminSpeakerResponse extends SpeakerResponse {
  @ApiPropertyOptional({ nullable: true, type: String })
  email: string | null;
}

export class BroadcastAudienceResponse {
  @ApiProperty({ example: "PARTICIPANT" })
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ description: "Nombre d'adresses e-mail distinctes." })
  count: number;
}

export class BroadcastResultResponse {
  @ApiProperty()
  recipients: number;

  @ApiProperty()
  sent: number;

  @ApiProperty()
  failed: number;
}

export class EventPassResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: "INNOVATOR" })
  kind: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ nullable: true, type: String, format: "date-time" })
  checkedInAt: Date | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: "date-time" })
  emailSentAt: Date | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}

export class MyEventPassResponse extends EventPassResponse {
  @ApiProperty({ description: "Image PNG du code QR, encodée en data URL." })
  qrCodeDataUrl: string;
}

export class CheckInResultResponse extends EventPassResponse {
  @ApiProperty({ description: "Vrai si ce badge avait déjà été enregistré sur place." })
  alreadyCheckedIn: boolean;
}

export class ResendEmailResponse extends EventPassResponse {
  @ApiProperty({ description: "Vrai si l'e-mail a bien été envoyé (faux si RESEND_API_KEY est absent ou l'envoi a échoué)." })
  emailSent: boolean;
}

export class ParticipantRegistrationResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  postnom: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  whatsapp: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  organization: string | null;

  @ApiProperty({ type: [String] })
  selectedDays: string[];

  @ApiProperty({ type: [String] })
  selectedActivities: string[];

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ description: "Image PNG du code QR, encodée en data URL." })
  qrCodeDataUrl: string;
}

export class ParticipantBadgeResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  organization: string | null;

  @ApiProperty({ type: [String] })
  selectedDays: string[];

  @ApiProperty({ type: [String] })
  selectedActivities: string[];

  @ApiProperty()
  badgeEligible: boolean;

  @ApiProperty({ description: "Image PNG du code QR, encodée en data URL." })
  qrCodeDataUrl: string;
}

export class ParticipantAdminListItemResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  whatsapp: string;

  @ApiProperty()
  city: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  organization: string | null;

  @ApiProperty({ type: [String] })
  selectedDays: string[];

  @ApiPropertyOptional({ nullable: true, type: String, format: "date-time" })
  emailSentAt: Date | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}

export class ParticipantAdminListPageResponse {
  @ApiProperty({ type: [ParticipantAdminListItemResponse] })
  items: ParticipantAdminListItemResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class ResendParticipantEmailResponse {
  @ApiProperty({ description: "Vrai si l'e-mail a bien été envoyé (faux si RESEND_API_KEY est absent ou l'envoi a échoué)." })
  emailSent: boolean;
}

export const OPENAPI_MODELS = [
  HealthData,
  SessionUserData,
  PoleResponse,
  JobResponse,
  JobWithPoleResponse,
  PoleWithJobsResponse,
  SpeakerResponse,
  CommitteeApplicationRecord,
  VolunteerApplicationRecord,
  CommitteeApplicationDetail,
  VolunteerApplicationDetail,
  ApplicationListItemResponse,
  ApplicationListPage,
  JobCountStat,
  TeamCountStat,
  DayCountStat,
  AdminStatsResponse,
  StaffNotificationItem,
  NotificationListResponse,
  OrganizationProfileResponse,
  OrganizationNeedResponse,
  InnovatorProfileResponse,
  InnovatorProjectResponse,
  NeedListPage,
  ProjectListPage,
  UserNotificationItem,
  UserNotificationListResponse,
  MarketplaceCatalogResponse,
  EventPassResponse,
  MyEventPassResponse,
  CheckInResultResponse,
  ResendEmailResponse,
  ParticipantRegistrationResponse,
  ParticipantBadgeResponse,
  ParticipantAdminListItemResponse,
  ParticipantAdminListPageResponse,
  ResendParticipantEmailResponse,
  AdminSpeakerResponse,
  BroadcastAudienceResponse,
  BroadcastResultResponse,
];
