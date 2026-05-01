import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditColumnsToDesigns1785000000000 implements MigrationInterface {
  name = 'AddAuditColumnsToDesigns1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "designs"
         ADD COLUMN "created_by" uuid,
         ADD COLUMN "created_by_name" varchar(200),
         ADD COLUMN "approved_by" uuid,
         ADD COLUMN "approved_by_name" varchar(200),
         ADD COLUMN "updated_by" uuid,
         ADD COLUMN "updated_by_name" varchar(200)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "designs"
         DROP COLUMN "updated_by_name",
         DROP COLUMN "updated_by",
         DROP COLUMN "approved_by_name",
         DROP COLUMN "approved_by",
         DROP COLUMN "created_by_name",
         DROP COLUMN "created_by"`,
    );
  }
}
