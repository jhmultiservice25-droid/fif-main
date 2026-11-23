import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class FestivalDayDto {
  @ApiProperty({ example: "2026-12-02" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Date attendue au format AAAA-MM-JJ." })
  date: string;

  @ApiPropertyOptional({ example: "Jour 1" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  label?: string;

  @ApiPropertyOptional({ example: "Inspirer • Découvrir • Connecter" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  theme?: string;
}

export type IFestivalDayInput = FestivalDayDto;

export class FestivalSettingsDto {
  @ApiPropertyOptional({ example: "FIKIRI Innovation Festival" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: "FIF 2026" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  shortName?: string;

  @ApiPropertyOptional({ example: "Kinshasa" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ example: "RDC" })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ type: [FestivalDayDto], description: "Jours du festival, dans l'ordre." })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => FestivalDayDto)
  days?: FestivalDayDto[];

  @ApiPropertyOptional({ nullable: true, description: "Dernier moment pour générer son badge." })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  badgeDeadline?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  applicationsOpenAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  applicationsCloseAt?: string | null;
}

export class FestivalDaysPreviewDto {
  @ApiProperty({ type: [FestivalDayDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => FestivalDayDto)
  days: FestivalDayDto[];
}
