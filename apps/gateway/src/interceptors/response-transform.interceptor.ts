import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}

interface StandardResponse<T> {
  success: boolean;
  data: T | null;
  meta?: { total: number; page: number; limit: number; totalPages: number };
}

const STRIP_FIELDS = new Set([
  'passwordHash',
  'password_hash',
  'refreshToken',
  'refresh_token',
  'tokenHash',
  'token_hash',
]);

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<StandardResponse<unknown>> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data === null || data === undefined) {
          return { success: true, data: null };
        }
        if (this.isStandardResponse(data)) return data;
        if (this.isAuthResponse(data)) {
          // Pass through auth tokens unsanitized — frontend needs them once, then stores.
          return { success: true, data };
        }
        if (this.isPaginated(data)) {
          const limit = data.limit ?? 50;
          return {
            success: true,
            data: this.sanitize(data.items),
            meta: {
              total: data.total,
              page: data.page ?? 1,
              limit,
              totalPages: Math.max(1, Math.ceil(data.total / limit)),
            },
          };
        }
        return { success: true, data: this.sanitize(data) };
      }),
    );
  }

  private isStandardResponse(d: unknown): d is StandardResponse<unknown> {
    return typeof d === 'object' && d !== null && 'success' in d;
  }

  private isAuthResponse(d: unknown): boolean {
    return typeof d === 'object' && d !== null && ('accessToken' in d || 'refreshToken' in d);
  }

  private isPaginated(d: unknown): d is PaginatedResponse<unknown> {
    return (
      typeof d === 'object' &&
      d !== null &&
      'items' in d &&
      'total' in d &&
      Array.isArray((d as PaginatedResponse<unknown>).items)
    );
  }

  private sanitize(data: unknown): unknown {
    if (Array.isArray(data)) return data.map((i) => this.sanitize(i));
    if (data !== null && typeof data === 'object') {
      const src = data as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) {
        if (STRIP_FIELDS.has(k)) continue;
        out[k] = this.sanitize(v);
      }
      return out;
    }
    return data;
  }
}
