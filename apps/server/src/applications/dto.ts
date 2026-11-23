import { SEX_OPTIONS, VOLUNTEER_TEAMS } from "../domain";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

const SEX = [...SEX_OPTIONS];
const TEAMS = VOLUNTEER_TEAMS.map((team) => team.id);

export class CommitteeApplicationDto {
  @ApiProperty({ example: "Mbala" })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty({ example: "Kabasele" })
  @IsString()
  @MinLength(1)
  postnom: string;

  @ApiProperty({ example: "Amina" })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ enum: SEX })
  @IsIn(SEX)
  sex: string;

  @ApiProperty({ example: "1998-04-12", description: "Date de naissance (ISO)." })
  @IsString()
  birthDate: string;

  @ApiProperty({ example: "Kinshasa" })
  @IsString()
  @MinLength(1)
  city: string;

  @ApiProperty({ example: "+243810000000" })
  @IsString()
  @MinLength(8)
  whatsapp: string;

  @ApiProperty({ example: "amina@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Identifiant du poste principal." })
  @IsString()
  primaryJobId: string;

  @ApiPropertyOptional({ description: "Deuxième choix de poste, différent du principal." })
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsString()
  secondaryJobId?: string;

  @ApiProperty({ minLength: 10, description: "150 mots maximum." })
  @IsString()
  @MinLength(10)
  motivation: string;
}

export class VolunteerApplicationDto {
  @ApiProperty({ example: "Mbala" })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty({ example: "Kabasele" })
  @IsString()
  @MinLength(1)
  postnom: string;

  @ApiProperty({ example: "Jean" })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ enum: SEX })
  @IsIn(SEX)
  sex: string;

  @ApiProperty({ example: "2001-06-20", description: "Date de naissance (ISO)." })
  @IsString()
  birthDate: string;

  @ApiProperty({ example: "Kinshasa" })
  @IsString()
  @MinLength(1)
  city: string;

  @ApiProperty({ example: "+243810000000" })
  @IsString()
  @MinLength(8)
  whatsapp: string;

  @ApiProperty({ example: "jean@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: TEAMS, example: "accueil" })
  @IsIn(TEAMS)
  primaryTeamId: string;

  @ApiPropertyOptional({ enum: TEAMS })
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsIn(TEAMS)
  secondaryTeamId?: string;

  @ApiProperty({ minLength: 10, description: "150 mots maximum." })
  @IsString()
  @MinLength(10)
  motivation: string;
}

export class PatchApplicationDto {
  @ApiPropertyOptional({ description: "Statut comité ou volontaire, selon le type de candidature." })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignmentTeamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignmentZone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignmentLead?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignmentShift?: string;
}

export class ListQueryDto {
  @ApiPropertyOptional({ enum: ["COMMITTEE", "VOLUNTEER"], description: "Filtrer par type de candidature." })
  @IsOptional()
  @IsIn(["COMMITTEE", "VOLUNTEER"])
  kind?: "COMMITTEE" | "VOLUNTEER";

  @ApiPropertyOptional({ description: "Recherche sur nom, e-mail ou WhatsApp." })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
