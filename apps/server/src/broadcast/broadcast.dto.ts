import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsIn, IsString, MaxLength, MinLength } from "class-validator";

export const BROADCAST_AUDIENCES = [
  "PARTICIPANT",
  "SPEAKER",
  "COMMITTEE",
  "VOLUNTEER",
  "INNOVATOR",
  "ORGANIZATION",
] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

export const BROADCAST_AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  PARTICIPANT: "Participants",
  SPEAKER: "Speakers",
  COMMITTEE: "Candidats comité",
  VOLUNTEER: "Candidats volontaires",
  INNOVATOR: "Innovateurs",
  ORGANIZATION: "Organisations",
};

export class SendBroadcastDto {
  @ApiProperty({ enum: BROADCAST_AUDIENCES, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(BROADCAST_AUDIENCES, { each: true })
  audiences: BroadcastAudience[];

  @ApiProperty({ example: "Informations pratiques — FIF 2026" })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject: string;

  @ApiProperty({ description: "Texte brut ; les retours à la ligne sont conservés." })
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  body: string;
}
