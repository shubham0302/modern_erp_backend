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

import { Design } from './design.entity';
import { SizeFinish } from './size-finish.entity';

@Entity('design_size_finish')
@Index('idx_dsf_pair', ['designId', 'sizeFinishId'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_dsf_design_id', ['designId'])
@Index('idx_dsf_size_finish_id', ['sizeFinishId'])
export class DesignSizeFinish {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'design_id', type: 'uuid' })
  designId!: string;

  @ManyToOne(() => Design, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design!: Design;

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
