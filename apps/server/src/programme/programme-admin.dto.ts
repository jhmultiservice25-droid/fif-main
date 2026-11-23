import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export const SESSION_TYPES = ["PLENARY", "TALK", "MASTERCLASS", "WORKSHOP", "PITCH", "NETWORKING", "BREAK", "SOCIAL", "VILLAGE"];
export const VISIBILITIES = ["PUBLIC", "INVITE_ONLY"];
export const ADMISSIONS = ["NONE", "OPEN", "APPROVAL"];

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class SessionInputDto {
  @ApiProperty({ example: "Masterclass IA générative" })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ enum: SESSION_TYPES })
  @IsIn(SESSION_TYPES)
  type: string;

  @ApiProperty({ example: "2026-11-26T10:00:00+01:00" })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: "2026-11-26T12:30:00+01:00" })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  roomId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  speakerIds?: string[];

  @ApiProperty({ enum: VISIBILITIES })
  @IsIn(VISIBILITIES)
  visibility: string;

  @ApiProperty({ enum: ADMISSIONS })
  @IsIn(ADMISSIONS)
  admission: string;

  @ApiPropertyOptional({ nullable: true, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  waitlistEnabled?: boolean;

  @ApiPropertyOptional({ description: "Confirme l'enregistrement malgré des conflits bloquants." })
  @IsOptional()
  @IsBoolean()
  acknowledgeConflicts?: boolean;
}

export class UpdateSessionDto extends SessionInputDto {
  @ApiProperty({ description: "Version lue ; un écart signifie qu'un autre admin a modifié la session." })
  @IsInt()
  version: number;
}

export class CheckSessionDto extends SessionInputDto {
  @ApiPropertyOptional({ description: "Session modifiée (exclue de ses propres conflits)." })
  @IsOptional()
  @IsString()
  id?: string;
}

export class CancelSessionDto {
  @ApiPropertyOptional({ example: "Intervenant indisponible" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class AddAttendeeDto {
  @ApiProperty({ example: "amina@example.com" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;
}

export class DecideRequestsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  registrationIds: string[];

  @ApiProperty({ enum: ["APPROVE", "DECLINE"] })
  @IsIn(["APPROVE", "DECLINE"])
  decision: "APPROVE" | "DECLINE";

  @ApiPropertyOptional({ example: "Session réservée aux investisseurs." })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RoomInputDto {
  @ApiProperty({ example: "Salle B" })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number | null;

  @ApiPropertyOptional({ example: "#006da4" })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  order?: number;
}
