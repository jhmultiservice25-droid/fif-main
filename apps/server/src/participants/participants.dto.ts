import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMinSize, IsArray, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class ParticipantRegistrationDto {
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

  @ApiPropertyOptional({ example: "Ministère du Numérique" })
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsString()
  organization?: string;

  @ApiProperty({ type: [String], description: "Identifiants des jours choisis." })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selectedDays: string[];

  @ApiProperty({ type: [String], description: "Identifiants des activités choisies." })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selectedActivities: string[];
}
