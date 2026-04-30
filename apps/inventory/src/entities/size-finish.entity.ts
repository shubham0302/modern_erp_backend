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

import { Finish } from './finish.entity';
import { Size } from './size.entity';

@Entity('size_finish')
@Index('idx_size_finish_pair', ['sizeId', 'finishId'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_size_finish_size_id', ['sizeId'])
@Index('idx_size_finish_finish_id', ['finishId'])
export class SizeFinish {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'size_id', type: 'uuid' })
  sizeId!: string;

  @ManyToOne(() => Size, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'size_id' })
  size!: Size;

  @Column({ name: 'finish_id', type: 'uuid' })
  finishId!: string;

  @ManyToOne(() => Finish, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'finish_id' })
  finish!: Finish;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
