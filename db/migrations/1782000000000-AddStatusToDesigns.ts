import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToDesigns1782000000000 implements MigrationInterface {
  name = 'AddStatusToDesigns1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "designs" ADD COLUMN "status" varchar(16) NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "designs" ADD COLUMN "approved_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "designs" ADD COLUMN "status_history" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );

    await queryRunner.query(
      `UPDATE "designs"
       SET "status_history" = jsonb_build_array(
         jsonb_build_object('status', 'pending', 'date', to_jsonb("created_at"))
       )
       WHERE "status_history" = '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "designs" DROP COLUMN "status_history"`);
    await queryRunner.query(`ALTER TABLE "designs" DROP COLUMN "approved_at"`);
    await queryRunner.query(`ALTER TABLE "designs" DROP COLUMN "status"`);
  }
}
