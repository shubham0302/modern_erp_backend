import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectionReasonToDesigns1783000000000 implements MigrationInterface {
  name = 'AddRejectionReasonToDesigns1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "designs" ADD COLUMN "rejection_reason" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "designs" DROP COLUMN "rejection_reason"`);
  }
}
