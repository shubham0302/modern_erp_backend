import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(PASSWORD_REGEX, { message: 'PASSWORD_TOO_WEAK' })
  password!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
