import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedByToFinishes1780000000000 implements MigrationInterface {
  name = 'AddUpdatedByToFinishes1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "finishes" ADD COLUMN "updated_by" uuid`);
    await queryRunner.query(
      `ALTER TABLE "finishes" ADD COLUMN "updated_by_platform" varchar(16)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "finishes" DROP COLUMN "updated_by_platform"`);
    await queryRunner.query(`ALTER TABLE "finishes" DROP COLUMN "updated_by"`);
  }
}
