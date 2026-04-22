import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Admin } from './admin.entity';

@Entity('admin_security_logs')
@Index('idx_admin_security_logs_admin_id', ['adminId'])
@Index('idx_admin_security_logs_action_type', ['actionType'])
@Index('idx_admin_security_logs_created_at', ['createdAt'])
export class AdminSecurityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId!: string | null;

  @ManyToOne(() => Admin, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin!: Admin | null;

  @Column({ name: 'admin_name', type: 'varchar', nullable: true })
  adminName!: string | null;

  @Column({ name: 'action_type', type: 'varchar' })
  actionType!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
