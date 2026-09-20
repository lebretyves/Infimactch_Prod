import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsString, Length, Max, Min } from 'class-validator';

/** The professional search centre is independent of the postal address. */
export class SearchAreaDto {
  @ApiProperty({ type: Number, minimum: -90, maximum: 90 })
  @IsNumber() @Min(-90) @Max(90)
  latitude!: number;

  @ApiProperty({ type: Number, minimum: -180, maximum: 180 })
  @IsNumber() @Min(-180) @Max(180)
  longitude!: number;

  @ApiProperty({ type: Number, minimum: 0.1, maximum: 1000 })
  @IsNumber() @Min(0.1) @Max(1000)
  radiusKm!: number;

  @ApiProperty({ type: String, minLength: 1, maxLength: 200 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 200)
  city!: string;
}
