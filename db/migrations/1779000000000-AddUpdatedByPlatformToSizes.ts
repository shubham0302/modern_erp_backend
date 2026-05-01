import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedByPlatformToSizes1779000000000 implements MigrationInterface {
  name = 'AddUpdatedByPlatformToSizes1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sizes" ADD COLUMN "updated_by_platform" varchar(16)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sizes" DROP COLUMN "updated_by_platform"`);
  }
}
