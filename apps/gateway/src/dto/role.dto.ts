import { Module } from '@modern_erp/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PermissionDto {
  @ApiProperty({ enum: Object.values(Module) })
  @IsIn(Object.values(Module))
  module!: string;

  @ApiProperty()
  @IsBoolean()
  canRead!: boolean;

  @ApiProperty()
  @IsBoolean()
  canWrite!: boolean;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'Store Manager', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [PermissionDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions!: PermissionDto[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class ReplacePermissionsDto {
  @ApiProperty({ type: [PermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions!: PermissionDto[];
}
