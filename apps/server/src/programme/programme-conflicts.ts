/** Conflict rules shared by the dry-run check and every write (ADR-003). */

export interface IConflictCandidate {
  id?: string;
  startsAt: Date;
  endsAt: Date;
  roomId: string | null;
  speakerIds: string[];
  capacity: number | null;
}

export interface IExistingSession {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  roomId: string | null;
  status: string;
  speakerIds: string[];
  roomName: string | null;
}

export interface IConflict {
  code: "SPEAKER_OVERLAP" | "ROOM_OVERLAP" | "CAPACITY_BELOW_REGISTERED" | "PARALLEL";
  severity: "blocking" | "info";
  message: string;
  sessionIds: string[];
}

export const overlaps = (a: { startsAt: Date; endsAt: Date }, b: { startsAt: Date; endsAt: Date }) =>
  a.startsAt < b.endsAt && b.startsAt < a.endsAt;

export function findConflicts(
  candidate: IConflictCandidate,
  others: IExistingSession[],
  speakerNames: Map<string, string>,
  registeredCount: number,
): IConflict[] {
  const conflicts: IConflict[] = [];
  const overlapping = others.filter(
    (other) => other.id !== candidate.id && other.status !== "CANCELLED" && overlaps(candidate, other),
  );

  for (const speakerId of candidate.speakerIds) {
    const clashes = overlapping.filter((other) => other.speakerIds.includes(speakerId));
    if (clashes.length) {
      conflicts.push({
        code: "SPEAKER_OVERLAP",
        severity: "blocking",
        message: `${speakerNames.get(speakerId) ?? "Un intervenant"} intervient déjà dans « ${clashes.map((c) => c.title).join(" », « ")} » au même moment.`,
        sessionIds: clashes.map((c) => c.id),
      });
    }
  }

  if (candidate.roomId) {
    const clashes = overlapping.filter((other) => other.roomId === candidate.roomId);
    if (clashes.length) {
      conflicts.push({
        code: "ROOM_OVERLAP",
        severity: "blocking",
        message: `${clashes[0].roomName ?? "La salle"} est déjà occupée par « ${clashes.map((c) => c.title).join(" », « ")} ».`,
        sessionIds: clashes.map((c) => c.id),
      });
    }
  }

  if (candidate.capacity != null && registeredCount > candidate.capacity) {
    conflicts.push({
      code: "CAPACITY_BELOW_REGISTERED",
      severity: "blocking",
      message: `${registeredCount} personnes sont déjà inscrites pour ${candidate.capacity} places : ${registeredCount - candidate.capacity} passeront en liste d'attente.`,
      sessionIds: [],
    });
  }

  if (overlapping.length) {
    conflicts.push({
      code: "PARALLEL",
      severity: "info",
      message: `Se déroule en même temps que : ${overlapping.map((o) => `${o.title}${o.roomName ? ` (${o.roomName})` : ""}`).join(", ")}.`,
      sessionIds: overlapping.map((o) => o.id),
    });
  }
  return conflicts;
}
