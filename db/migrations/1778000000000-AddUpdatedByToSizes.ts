import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedByToSizes1778000000000 implements MigrationInterface {
  name = 'AddUpdatedByToSizes1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sizes" ADD COLUMN "updated_by" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sizes" DROP COLUMN "updated_by"`);
  }
}
