import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Opaque refresh token issued at login' })
  @IsString()
  refreshToken!: string;

  @ApiPropertyOptional({ example: 'device-uuid-123' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
