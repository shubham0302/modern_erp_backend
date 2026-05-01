import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DesignSizeFinish } from './design-size-finish.entity';
import { Series } from './series.entity';

export type DesignStatus = 'pending' | 'approved' | 'rejected';

export interface DesignStatusEntry {
  status: DesignStatus;
  date: string;
  reason?: string;
}

@Entity('designs')
@Index('idx_designs_series_name', ['seriesId', 'name'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_designs_series_id', ['seriesId'])
@Index('idx_designs_is_active', ['isActive'])
export class Design {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ name: 'series_id', type: 'uuid' })
  seriesId!: string;

  @ManyToOne(() => Series, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'series_id' })
  series!: Series;

  @OneToMany(() => DesignSizeFinish, (dsf) => dsf.design)
  designSizeFinishes!: DesignSizeFinish[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: DesignStatus;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'status_history', type: 'jsonb', default: () => "'[]'::jsonb" })
  statusHistory!: DesignStatusEntry[];

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'created_by_name', type: 'varchar', length: 200, nullable: true })
  createdByName!: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'approved_by_name', type: 'varchar', length: 200, nullable: true })
  approvedByName!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @Column({ name: 'updated_by_name', type: 'varchar', length: 200, nullable: true })
  updatedByName!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
