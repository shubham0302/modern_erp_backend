import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class CreateStaffDto {
  @ApiProperty({ example: 'John Staff', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'john@modernerp.local' })
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

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roleId!: string;
}

export class UpdateStaffDto {
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

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Only super admins can update email',
    example: 'staff@modernerp.local',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class AdminChangeStaffPasswordDto {
  @ApiProperty({ description: 'Min 8 chars, must contain a letter and a digit' })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: 'PASSWORD_TOO_WEAK' })
  newPassword!: string;
}
