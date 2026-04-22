import { Platform } from '../enums/platform.enum';

export interface JwtPayload {
  sub: string;
  platform: Platform;
  version: string;
  iat: number;
  exp: number;
}
