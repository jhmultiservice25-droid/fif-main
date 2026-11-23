import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEmail, IsInt, IsOptional, IsString, MinLength } from "class-validator";

export class UpsertSpeakerDto {
  @ApiProperty({ example: "Amina Kabasele" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: "Ministre du Numérique" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "Courte biographie." })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: "E-mail de contact (jamais exposé publiquement)." })
  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    type: [String],
    description: "Jours de participation (ex. 2026-11-25).",
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  days?: string[];

  @ApiPropertyOptional({ description: "Ordre d'affichage, plus petit = affiché en premier." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}
