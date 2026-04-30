import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Admin } from '../entities/admin.entity';

@Injectable()
export class SuperAdminSeederService implements OnModuleInit {
  constructor(
    private config: ConfigService,
    @InjectRepository(Admin) private repo: Repository<Admin>,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.getOrThrow<string>('SEED_SUPER_ADMIN_EMAIL');
    const password = this.config.getOrThrow<string>('SEED_SUPER_ADMIN_PASSWORD');
    const name = this.config.getOrThrow<string>('SEED_SUPER_ADMIN_NAME');
    const phone = this.config.getOrThrow<string>('SEED_SUPER_ADMIN_PHONE');
    const rounds = parseInt(this.config.getOrThrow<string>('BCRYPT_ROUNDS'), 10);

    const existing = await this.repo.findOne({ where: { email } });
    if (existing) return;

    const passwordHash = await bcrypt.hash(password, rounds);
    await this.repo.save(
      this.repo.create({
        name,
        email,
        phone,
        passwordHash,
        isSuperAdmin: true,
        isActive: true,
      }),
    );
  }
}
