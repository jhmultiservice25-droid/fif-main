import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsString, MinLength } from "class-validator";

export class HackademyApplicationDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  university: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  city: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  teamName: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  teamLeader: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  whatsapp: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ type: [String], minItems: 4, maxItems: 4 })
  @Transform(({ value }) => {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch { return []; }
  })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  memberNames: string[];
}
