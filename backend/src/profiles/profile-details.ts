import { Type } from "class-transformer";
import { IsArray, ArrayMaxSize, ArrayUnique, IsIn, ValidateNested } from "class-validator";
import clinicalCatalog from "../reference-data/clinical-skills.json";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsOptional,
  IsEmail,
  IsString,
  Length,
  Matches,
  IsInt,
  Min,
  Max,
} from "class-validator";

export class PracticeServicesDto {
  @ApiProperty({ required: false, type: [String], enum: clinicalCatalog.servicesByQualification.IDE })
  @IsOptional() @IsArray() @ArrayMaxSize(60) @ArrayUnique()
  @IsIn(clinicalCatalog.servicesByQualification.IDE, { each: true })
  IDE?: string[];
  @ApiProperty({ required: false, type: [String], enum: clinicalCatalog.servicesByQualification.IADE })
  @IsOptional() @IsArray() @ArrayMaxSize(60) @ArrayUnique()
  @IsIn(clinicalCatalog.servicesByQualification.IADE, { each: true })
  IADE?: string[];
  @ApiProperty({ required: false, type: [String], enum: clinicalCatalog.servicesByQualification.IBODE })
  @IsOptional() @IsArray() @ArrayMaxSize(60) @ArrayUnique()
  @IsIn(clinicalCatalog.servicesByQualification.IBODE, { each: true })
  IBODE?: string[];
}

export class ProfileDetailsDto {
  @ApiProperty({ required: false, type: () => PracticeServicesDto })
  @IsOptional() @ValidateNested() @Type(() => PracticeServicesDto)
  practiceServices?: PracticeServicesDto;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(3, 40)
  phone?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  address?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^\d{5}$/)
  postalCode?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  city?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  mobilityCity?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  diploma?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  diplomaYear?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  transport?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  ideDiplomaYear?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  iadeDiplomaYear?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  ibodeDiplomaYear?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  referenceName?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  referenceRole?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  referenceEstablishment?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 254)
  @IsEmail()
  referenceEmail?: string;
}
