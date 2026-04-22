import { Injectable } from '@nestjs/common';

export interface LocalizedResult {
  message: string;
  localizedDetails: unknown;
}

const DEFAULT_MESSAGES: Record<string, string> = {
  RATE_LIMITED: 'Too many requests, please try again later',
  MISSING_TOKEN: 'Authentication required',
  TOKEN_EXPIRED: 'Session expired, please login again',
  INVALID_TOKEN: 'Invalid authentication',
  PLATFORM_MISMATCH: 'Platform mismatch',
  INVALID_CREDENTIALS: 'Invalid email or password',
  REFRESH_TOKEN_REUSE_DETECTED: 'Session invalidated for security — please login again',

  USER_NOT_FOUND: 'User not found',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated',
  ACCESS_SUSPENDED: 'Your access has been suspended',

  ADMIN_NOT_FOUND: 'Admin not found',
  STAFF_NOT_FOUND: 'Staff not found',
  ROLE_NOT_FOUND: 'Role not found',
  ROLE_IN_USE: 'Cannot delete role — staff are assigned to it',
  ROLE_NAME_ALREADY_EXISTS: 'A role with this name already exists',
  EMAIL_ALREADY_EXISTS: 'Email is already in use',

  SUPER_ADMIN_REQUIRED: 'Super admin access required',
  SUPER_ADMIN_PROTECTED: 'This operation is not permitted on super admin',

  VALIDATION_FAILED: 'Invalid request data',
  PASSWORD_TOO_WEAK: 'Password must be at least 8 characters with letters and digits',

  ROUTE_NOT_FOUND: 'Route not found',

  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',

  INTERNAL_ERROR: 'Something went wrong',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  UNKNOWN_ERROR: 'An unexpected error occurred',
};

@Injectable()
export class ErrorLocalizerService {
  resolve(errorCode: string, _lang: string, details: unknown): LocalizedResult {
    return {
      message: DEFAULT_MESSAGES[errorCode] ?? DEFAULT_MESSAGES.UNKNOWN_ERROR,
      localizedDetails: details,
    };
  }
}
