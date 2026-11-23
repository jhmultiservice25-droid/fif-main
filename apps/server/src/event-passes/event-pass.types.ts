export const EVENT_PASS_KINDS = ["COMMITTEE", "VOLUNTEER", "INNOVATOR", "ORGANIZATION", "PARTICIPANT"] as const;
export type EventPassKind = (typeof EVENT_PASS_KINDS)[number];

export const EVENT_PASS_KIND_LABELS: Record<EventPassKind, string> = {
  COMMITTEE: "Comité d'organisation",
  VOLUNTEER: "Volontaire",
  INNOVATOR: "Innovateur",
  ORGANIZATION: "Organisation",
  PARTICIPANT: "Participant",
};
