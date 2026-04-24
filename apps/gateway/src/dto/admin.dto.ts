import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class CreateAdminDto {
  @ApiProperty({ example: 'Jane Admin', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'jane@modernerp.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+919999999999', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'Password123', description: 'Min 8 chars, must contain a letter and a digit' })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: 'PASSWORD_TOO_WEAK' })
  password!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;
}

export class UpdateAdminDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;
}
