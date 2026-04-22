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

@Entity('staff_security_logs')
@Index('idx_staff_security_logs_staff_id', ['staffId'])
@Index('idx_staff_security_logs_action_type', ['actionType'])
@Index('idx_staff_security_logs_created_at', ['createdAt'])
export class StaffSecurityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'staff_id', type: 'uuid', nullable: true })
  staffId!: string | null;

  @ManyToOne(() => Staff, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'staff_id' })
  staff!: Staff | null;

  @Column({ name: 'staff_name', type: 'varchar', nullable: true })
  staffName!: string | null;

  @Column({ name: 'action_type', type: 'varchar' })
  actionType!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
