import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'

export const WISH_TAG_PATTERN =
  /^[\p{L}\p{M}\p{N}]+(?:[-'’][\p{L}\p{M}\p{N}]+)*(?: [\p{L}\p{M}\p{N}]+(?:[-'’][\p{L}\p{M}\p{N}]+)*)?$/u

export class CreateWishDto {
  @ApiProperty({ minLength: 3, maxLength: 160 })
  @IsString()
  @Length(3, 160)
  @Transform(({ value }) => value?.trim())
  title: string
  @ApiProperty({
    type: [String],
    minItems: 1,
    maxItems: 2,
    maxLength: 50,
    description: 'One or two wish tags; each tag contains one or two words',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  @Matches(WISH_TAG_PATTERN, { each: true, message: 'each category must contain one or two words' })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((tag) => (typeof tag === 'string' ? tag.trim().replace(/\s+/g, ' ') : tag))
      : value,
  )
  category: string[]
  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @IsString()
  @Length(10, 2000)
  @Transform(({ value }) => value?.trim())
  description: string
  @ApiPropertyOptional({ minLength: 10, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(10, 1000)
  @Transform(({ value }) => value?.trim())
  impact?: string
}
export class UpdateWishDto extends PartialType(CreateWishDto) {}
export class BrowseWishesDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string
  @ApiPropertyOptional({ enum: ['newest', 'most_endorsed'] })
  @IsOptional()
  @IsIn(['newest', 'most_endorsed'])
  sort: 'newest' | 'most_endorsed' = 'newest'
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1
  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20
}
