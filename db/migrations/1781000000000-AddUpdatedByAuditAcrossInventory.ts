import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedByAuditAcrossInventory1781000000000 implements MigrationInterface {
  name = 'AddUpdatedByAuditAcrossInventory1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sizes" ADD COLUMN "updated_by_name" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "finishes" ADD COLUMN "updated_by_name" varchar(255)`);

    await queryRunner.query(`ALTER TABLE "series" ADD COLUMN "updated_by" uuid`);
    await queryRunner.query(
      `ALTER TABLE "series" ADD COLUMN "updated_by_platform" varchar(16)`,
    );
    await queryRunner.query(`ALTER TABLE "series" ADD COLUMN "updated_by_name" varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "updated_by_name"`);
    await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "updated_by_platform"`);
    await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "updated_by"`);

    await queryRunner.query(`ALTER TABLE "finishes" DROP COLUMN "updated_by_name"`);
    await queryRunner.query(`ALTER TABLE "sizes" DROP COLUMN "updated_by_name"`);
  }
}
