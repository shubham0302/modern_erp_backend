import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

// ----- Size -----

export class CreateSizeDto {
  @ApiProperty({ example: '40 x 40', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;
}

export class UpdateSizeDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ----- Finish -----

export class CreateFinishDto {
  @ApiProperty({ example: 'matt', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Sizes this finish should be available in. Mappings are created atomically.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sizeIds?: string[];
}

export class UpdateFinishDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Size IDs to add as new mappings. Already-mapped sizes are silently skipped.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sizeIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'Size IDs whose mapping with this finish should be soft-deleted. Cascades through SeriesSizeFinish and Design.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  deletedSizeIds?: string[];
}

// ----- Series -----

export class CreateSeriesDto {
  @ApiProperty({ example: 'GL', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      '(size, finish) mapping ids to bind to this series at creation. Validated and inserted atomically.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sizeFinishIds?: string[];
}

export class UpdateSeriesDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'SizeFinish ids to bind to this series as new (size, finish) combinations. Already-mapped pairs are silently skipped.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sizeFinishIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'SizeFinish ids whose mapping with this series should be soft-deleted. Cascades through Design.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  deletedSizeFinishIds?: string[];
}

// ----- Design -----

export class CreateDesignDto {
  @ApiProperty({ example: 'Marble-Gold', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional thumbnail URL.',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  thumbnailUrl?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  seriesId!: string;

  @ApiProperty({
    type: [String],
    description:
      'SizeFinish ids the design covers. Each must be bound to seriesId via SeriesSizeFinish.',
    example: ['00000000-0000-0000-0000-000000000001'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  sizeFinishIds!: string[];
}

export class UpdateDesignDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Pass empty string to clear; omit to leave unchanged.',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  thumbnailUrl?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  seriesId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'When non-empty, replaces the design SizeFinish set.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  sizeFinishIds?: string[];
}

export class RejectDesignDto {
  @ApiProperty({
    example: 'Color does not match brand guidelines.',
    maxLength: 1000,
    description: 'Reason shown to staff explaining why this design was rejected.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}

// ----- Mapping bodies -----

export class AddFinishToSizeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  finishId!: string;
}

export class AddSeriesToSizeFinishDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sizeFinishId!: string;
}
