import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Length, MaxLength, Min } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CatalogueQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sector?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

export class ContactDto {
  @ApiProperty({ enum: ["SOLUTION", "PROJECT"] })
  @IsIn(["SOLUTION", "PROJECT"])
  targetType: "SOLUTION" | "PROJECT";

  @ApiProperty({ description: "Référence de la solution ou identifiant du projet." })
  @IsString()
  @MaxLength(100)
  targetId: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  senderName: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  senderEmail: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  senderOrganization?: string;

  @ApiProperty({ enum: ["DONOR", "INSTITUTION", "COMPANY", "PARTNER", "OTHER"] })
  @IsIn(["DONOR", "INSTITUTION", "COMPANY", "PARTNER", "OTHER"])
  senderType: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(20, 2000)
  message: string;

  @ApiPropertyOptional({ description: "Champ piège anti-robots : doit rester vide." })
  @IsOptional()
  @IsString()
  website?: string;
}
