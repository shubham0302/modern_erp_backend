import { IsString, Matches } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @Matches(PASSWORD_REGEX, { message: 'PASSWORD_TOO_WEAK' })
  newPassword!: string;
}
