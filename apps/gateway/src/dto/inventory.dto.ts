import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

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
}

// ----- Series -----

export class CreateSeriesDto {
  @ApiProperty({ example: 'GL', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;
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
}

// ----- Design -----

export class CreateDesignDto {
  @ApiProperty({ example: 'Marble-Gold', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  seriesSizeFinishId!: string;
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
