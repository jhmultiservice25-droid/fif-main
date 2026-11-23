import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsEmail, IsInt, IsOptional, IsString, Max, Min, ValidateIf } from "class-validator";

export class PickDto {
  @ApiPropertyOptional({ default: true, description: "Afficher mon nom sur la page publique de la solution." })
  @IsOptional()
  @IsBoolean()
  listedPublicly?: boolean;
}

export class ShowcaseSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pickerOpen?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  deadline?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxPerInnovator?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxPerSolution?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  demoShowSessionIds?: string[];
}

export class AddPresenterDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  overrideLimits?: boolean;
}

export class MovePresenterDto {
  @ApiProperty()
  @IsString()
  toSolutionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  overrideLimits?: boolean;
}

export class ConfirmImportDto {
  @ApiPropertyOptional({ description: "Désactiver les solutions absentes du fichier." })
  @IsOptional()
  @IsBoolean()
  deactivateMissing?: boolean;
}
