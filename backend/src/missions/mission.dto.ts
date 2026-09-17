import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsUUID,
  IsIn,
  IsNumber,
  Min,
  Max,
  Length,
  IsArray,
  ArrayUnique,
  ArrayMaxSize,
  IsOptional,
  Matches,
} from "class-validator";
export class MissionDto {
  @ApiProperty({ type: () => String, required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  agencyId?: string | null;
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @IsUUID()
  staffingRequestId?: string;
  @ApiProperty({ type: () => String, required: true })
  @IsUUID()
  establishmentId!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(3, 150)
  title!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(10, 8000)
  description!: string;
  @ApiProperty({
    type: () => String,
    required: true,
    enum: ["IDE", "IADE", "IBODE"],
  })
  @IsIn(["IDE", "IADE", "IBODE"])
  qualification!: "IDE" | "IADE" | "IBODE";
  @ApiProperty({ type: () => String, required: true })
  @Matches(/^[A-Z][A-Z0-9_]{0,79}$/)
  service!: string;
  @ApiProperty({
    type: () => String,
    required: true,
    enum: ["ADULT", "PEDIATRIC", "MIXED"],
  })
  @IsIn(["ADULT", "PEDIATRIC", "MIXED"])
  population!: "ADULT" | "PEDIATRIC" | "MIXED";
  @ApiProperty({
    type: () => String,
    required: true,
    enum: ["NONE", "GENERAL", "SPECIALIZED"],
  })
  @IsIn(["NONE", "GENERAL", "SPECIALIZED"])
  block!: "NONE" | "GENERAL" | "SPECIALIZED";
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @Matches(/^[A-Z][A-Z0-9_]{0,79}$/)
  specialty?: string;
  @ApiProperty({ type: () => String, required: true, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Matches(/^[A-Z][A-Z0-9_]{0,79}$/, { each: true })
  requiredSkills!: string[];
  @ApiProperty({ type: () => String, required: true, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Matches(/^[A-Z][A-Z0-9_]{0,79}$/, { each: true })
  desiredSkills!: string[];
  @ApiProperty({ type: () => Number, required: true })
  @IsNumber()
  @Min(0)
  @Max(600)
  minExperienceMonths!: number;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  start!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  end!: string;
  @ApiProperty({
    type: () => String,
    required: true,
    enum: ["DAY", "NIGHT", "MIXED"],
  })
  @IsIn(["DAY", "NIGHT", "MIXED"])
  shift!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(5, 500)
  address!: string;
  @ApiProperty({ type: () => Number, required: true })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;
  @ApiProperty({ type: () => Number, required: true })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
  @ApiProperty({ type: () => Number, required: true })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10000)
  hourlySalary!: number;
}
