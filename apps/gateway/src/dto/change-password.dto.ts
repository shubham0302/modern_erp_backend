import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'Min 8 chars, must contain a letter and a digit' })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: 'PASSWORD_TOO_WEAK' })
  newPassword!: string;
}
