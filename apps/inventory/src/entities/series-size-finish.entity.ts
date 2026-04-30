import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Series } from './series.entity';
import { SizeFinish } from './size-finish.entity';

@Entity('series_size_finish')
@Index('idx_ssf_pair', ['seriesId', 'sizeFinishId'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_ssf_series_id', ['seriesId'])
@Index('idx_ssf_size_finish_id', ['sizeFinishId'])
export class SeriesSizeFinish {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'series_id', type: 'uuid' })
  seriesId!: string;

  @ManyToOne(() => Series, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'series_id' })
  series!: Series;

  @Column({ name: 'size_finish_id', type: 'uuid' })
  sizeFinishId!: string;

  @ManyToOne(() => SizeFinish, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'size_finish_id' })
  sizeFinish!: SizeFinish;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
