import { GatewayRequest } from '@modern_erp/common';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<GatewayRequest>();
    const res = context.switchToHttp().getResponse<{ setHeader: (k: string, v: string) => void }>();

    const hdr = req.headers['x-request-id'];
    const requestId =
      (typeof hdr === 'string' ? hdr : null) ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        res.setHeader('x-response-time', `${Date.now() - start}ms`);
      }),
    );
  }
}
