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

import { SeriesSizeFinish } from './series-size-finish.entity';

@Entity('designs')
@Index('idx_designs_mapping_name', ['seriesSizeFinishId', 'name'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_designs_mapping_id', ['seriesSizeFinishId'])
@Index('idx_designs_is_active', ['isActive'])
export class Design {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'series_size_finish_id', type: 'uuid' })
  seriesSizeFinishId!: string;

  @ManyToOne(() => SeriesSizeFinish, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'series_size_finish_id' })
  seriesSizeFinish!: SeriesSizeFinish;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
