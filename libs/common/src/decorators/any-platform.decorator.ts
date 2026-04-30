import { SetMetadata } from '@nestjs/common';

export const IS_ANY_PLATFORM_KEY = 'isAnyPlatform';

export const AnyPlatform = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_ANY_PLATFORM_KEY, true);
