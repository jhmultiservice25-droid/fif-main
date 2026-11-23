
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class ParticipantIdentityDto {
  @ApiProperty({ example: "Amina" })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName: string;

  @ApiProperty({ example: "Mbala" })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName: string;

  @ApiProperty({ example: "Kabasele" })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  postnom: string;

  @ApiProperty({ example: "Kinshasa" })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  city: string;

  @ApiProperty({ example: "+243810000000" })
  @Transform(trim)
  @IsString()
  @MinLength(8)
  @MaxLength(30)
  whatsapp: string;

  @ApiPropertyOptional({ example: "Ministère du Numérique" })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" && value.trim()
      ? value.trim()
      : undefined
  )
  @IsString()
  @MaxLength(120)
  organization?: string;
}

export class StartInterestDto {
  @ApiProperty({ example: "amina@example.com" })
  @Transform(trimLower)
  @IsEmail()
  email: string;

  @ApiProperty({
    type: [String],
    description: "Sessions choisies, tous jours confondus.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  @IsString({ each: true })
  sessionIds: string[];

  @ApiPropertyOptional({
    type: ParticipantIdentityDto,
    description: "Requis lorsque l'e-mail n'a pas encore d'espace.",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParticipantIdentityDto)
  identity?: ParticipantIdentityDto;
}

/**
 * Inscription publique sans code OTP.
 * Les informations d'identité sont obligatoires.
 */
export class RegisterParticipantDto {
  @ApiProperty({ example: "amina@example.com" })
  @Transform(trimLower)
  @IsEmail()
  email: string;

  @ApiProperty({
    type: [String],
    description: "Sessions publiques choisies.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  @IsString({ each: true })
  sessionIds: string[];

  @ApiProperty({
    type: ParticipantIdentityDto,
    description: "Identité complète obligatoire.",
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => ParticipantIdentityDto)
  identity: ParticipantIdentityDto;
}

export class RequestCodeDto {
  @ApiProperty({ example: "amina@example.com" })
  @Transform(trimLower)
  @IsEmail()
  email: string;
}

export class OnboardingCodeDto extends RequestCodeDto {
  @ApiProperty({
    enum: ["INNOVATOR", "ORGANIZATION"],
  })
  @IsIn(["INNOVATOR", "ORGANIZATION"])
  profile: "INNOVATOR" | "ORGANIZATION";
}

export class OnboardingDirectDto extends RequestCodeDto {
  @ApiProperty({
    enum: ["INNOVATOR", "ORGANIZATION"],
  })
  @IsIn(["INNOVATOR", "ORGANIZATION"])
  profile: "INNOVATOR" | "ORGANIZATION";
}

export class VerifyCodeDto extends RequestCodeDto {
  @ApiProperty({ example: "482913" })
  @Transform(trim)
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp: string;
}

export class JoinSessionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  @IsString({ each: true })
  sessionIds: string[];
}

export class PatchParticipantProfileDto {
  @ApiPropertyOptional({ example: "Kinshasa" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ example: "+243810000000" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(8)
  @MaxLength(30)
  whatsapp?: string;
}
