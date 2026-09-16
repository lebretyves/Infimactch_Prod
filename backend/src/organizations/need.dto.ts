import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { BadRequestException } from "@nestjs/common";
import { interval } from "../domain/matching";
import {
  ideServices,
  blockSpecialties,
} from "../reference-data/reference-data.module";
export class NeedDetailsDto {
  @ApiProperty({ enum: ["IDE", "IADE", "IBODE"] })
  @IsIn(["IDE", "IADE", "IBODE"])
  qualification!: "IDE" | "IADE" | "IBODE";
  @ApiProperty({ enum: ideServices }) @IsIn(ideServices) service!: string;
  @ApiProperty() @IsString() start!: string;
  @ApiProperty() @IsString() end!: string;
  @ApiProperty({ enum: ["DAY", "NIGHT", "MIXED"] })
  @IsIn(["DAY", "NIGHT", "MIXED"])
  shift!: "DAY" | "NIGHT" | "MIXED";
  @ApiProperty({ minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  headcount!: number;
  @ApiProperty({ enum: ["ADULT", "PEDIATRIC", "MIXED"] })
  @IsIn(["ADULT", "PEDIATRIC", "MIXED"])
  population!: "ADULT" | "PEDIATRIC" | "MIXED";
  @ApiProperty({ enum: ["NONE", "GENERAL", "SPECIALIZED"] })
  @IsIn(["NONE", "GENERAL", "SPECIALIZED"])
  block!: "NONE" | "GENERAL" | "SPECIALIZED";
  @ApiProperty({ required: false, enum: blockSpecialties })
  @IsOptional()
  @IsIn(blockSpecialties)
  specialty?: string;
  @ApiProperty({ type: String, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Matches(/^[A-Z][A-Z0-9_]{0,79}$/, { each: true })
  requiredSkills!: string[];
  @ApiProperty({ minimum: 0, maximum: 600 })
  @IsInt()
  @Min(0)
  @Max(600)
  minExperienceMonths!: number;
  @ApiProperty() @IsString() @Length(5, 500) @Matches(/\S/) @Transform(({value})=>typeof value==='string'?value.trim():value) address!: string;
}
export class NeedDto {
  @ApiProperty() @IsUUID() establishmentId!: string;
  @ApiProperty() @IsString() @Length(3, 150) @Matches(/\S/) @Transform(({value})=>typeof value==='string'?value.trim():value) title!: string;
  @ApiProperty()
  @IsString()
  @Length(10, 8000)
  @Matches(/\S/)
  @Transform(({value})=>typeof value==='string'?value.trim():value) description!: string;
  @ApiProperty({ type: () => NeedDetailsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => NeedDetailsDto)
  details!: NeedDetailsDto;
}
export function normalizeNeedDetails(
  details: NeedDetailsDto,
  now = Date.now(),
): NeedDetailsDto {
  const invalid = (message: string): never => {
    throw new BadRequestException({
      code: "STAFFING_REQUEST_INVALID",
      message,
    });
  };
  let bounds: [number, number];
  try {
    bounds = interval(details);
  } catch {
    return invalid(
      "Indiquez une date de fin après le début, avec des horaires valides.",
    );
  }
  if (bounds[0] <= now) invalid("Le début du besoin doit être dans le futur.");
  if (details.block === "SPECIALIZED" && !details.specialty)
    invalid("Choisissez la spécialité du bloc.");
  if (details.block !== "SPECIALIZED" && details.specialty)
    invalid("La spécialité concerne uniquement un bloc spécialisé.");
  return {
    ...details,
    start: new Date(bounds[0]).toISOString(),
    end: new Date(bounds[1]).toISOString(),
    address: details.address.trim(),
  };
}
