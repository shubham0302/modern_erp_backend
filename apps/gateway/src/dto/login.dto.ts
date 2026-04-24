import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123', description: 'Min 8 chars, must contain a letter and a digit' })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: 'PASSWORD_TOO_WEAK' })
  password!: string;

  @ApiPropertyOptional({ example: 'device-uuid-123' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
