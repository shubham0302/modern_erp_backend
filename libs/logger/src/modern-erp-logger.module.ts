import { Global, Module } from '@nestjs/common';

import { ModernERPLogger } from './modern-erp-logger.service';

@Global()
@Module({
  providers: [ModernERPLogger],
  exports: [ModernERPLogger],
})
export class ModernERPLoggerModule {}
