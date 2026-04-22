import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Staff } from './staff.entity';

@Entity('staff_refresh_tokens')
@Index('idx_staff_refresh_tokens_staff_id', ['staffId'])
@Index('idx_staff_refresh_tokens_token_hash', ['tokenHash'])
@Index('idx_staff_refresh_tokens_expires_at', ['expiresAt'])
export class StaffRefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'staff_id', type: 'uuid' })
  staffId!: string;

  @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff!: Staff;

  @Column({ name: 'token_hash', type: 'varchar' })
  tokenHash!: string;

  @Column({ name: 'device_id', type: 'varchar', nullable: true })
  deviceId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
