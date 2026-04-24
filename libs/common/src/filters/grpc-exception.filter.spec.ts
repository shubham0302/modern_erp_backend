import { status as GrpcStatus } from '@grpc/grpc-js';
import { ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { ErrorCode } from '../enums/error-codes.enum';

import { GrpcExceptionFilter } from './grpc-exception.filter';

const HOST = {} as ArgumentsHost;

interface WireError {
  code: number;
  details: string;
  message: string;
}

async function catchError(filter: GrpcExceptionFilter, exception: unknown): Promise<WireError> {
  const obs = filter.catch(exception, HOST);
  try {
    await firstValueFrom(obs);
    throw new Error('Observable did not error');
  } catch (err) {
    return err as WireError;
  }
}

describe('GrpcExceptionFilter', () => {
  const filter = new GrpcExceptionFilter();

  it('maps WRONG_PASSWORD to UNAUTHENTICATED with JSON details', async () => {
    const err = await catchError(
      filter,
      new RpcException({ errorCode: ErrorCode.WRONG_PASSWORD }),
    );

    expect(err.code).toBe(GrpcStatus.UNAUTHENTICATED);
    expect(err.message).toBe('WRONG_PASSWORD');
    expect(JSON.parse(err.details)).toEqual({ errorCode: 'WRONG_PASSWORD' });
  });

  it('maps EMAIL_NOT_FOUND to UNAUTHENTICATED', async () => {
    const err = await catchError(
      filter,
      new RpcException({ errorCode: ErrorCode.EMAIL_NOT_FOUND }),
    );

    expect(err.code).toBe(GrpcStatus.UNAUTHENTICATED);
    expect(JSON.parse(err.details).errorCode).toBe('EMAIL_NOT_FOUND');
  });

  it('maps EMAIL_ALREADY_EXISTS to ALREADY_EXISTS', async () => {
    const err = await catchError(
      filter,
      new RpcException({ errorCode: ErrorCode.EMAIL_ALREADY_EXISTS }),
    );

    expect(err.code).toBe(GrpcStatus.ALREADY_EXISTS);
  });

  it('falls back to UNKNOWN for unmapped errorCodes', async () => {
    const err = await catchError(filter, new RpcException({ errorCode: 'SOMETHING_NEW' }));

    expect(err.code).toBe(GrpcStatus.UNKNOWN);
    expect(JSON.parse(err.details).errorCode).toBe('SOMETHING_NEW');
  });

  it('treats non-RpcException as INTERNAL with INTERNAL_ERROR payload', async () => {
    const err = await catchError(filter, new Error('boom'));

    expect(err.code).toBe(GrpcStatus.INTERNAL);
    expect(err.message).toBe('boom');
    expect(JSON.parse(err.details).errorCode).toBe(ErrorCode.INTERNAL_ERROR);
  });

  it('handles RpcException with string payload', async () => {
    const err = await catchError(filter, new RpcException('oops'));

    expect(err.code).toBe(GrpcStatus.UNKNOWN);
    expect(JSON.parse(err.details).errorCode).toBe(ErrorCode.UNKNOWN_ERROR);
  });
});
