import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemodelDesignSeriesAndSizeFinishes1784000000000 implements MigrationInterface {
  name = 'RemodelDesignSeriesAndSizeFinishes1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "designs" ADD COLUMN "series_id" uuid, ADD COLUMN "thumbnail_url" text`,
    );

    await queryRunner.query(
      `CREATE TABLE "design_size_finish" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "design_id" uuid NOT NULL,
         "size_finish_id" uuid NOT NULL,
         "is_active" boolean NOT NULL DEFAULT true,
         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         "deleted_at" TIMESTAMP WITH TIME ZONE,
         CONSTRAINT "PK_design_size_finish" PRIMARY KEY ("id")
       )`,
    );

    await queryRunner.query(
      `UPDATE "designs" d SET "series_id" = ssf."series_id"
         FROM "series_size_finish" ssf WHERE d."series_size_finish_id" = ssf."id"`,
    );
    await queryRunner.query(
      `INSERT INTO "design_size_finish" ("design_id", "size_finish_id", "is_active", "deleted_at")
         SELECT d."id", ssf."size_finish_id", d."is_active", d."deleted_at"
         FROM "designs" d JOIN "series_size_finish" ssf ON ssf."id" = d."series_size_finish_id"`,
    );

    await queryRunner.query(`ALTER TABLE "designs" DROP CONSTRAINT "FK_designs_ssf"`);
    await queryRunner.query(`DROP INDEX "public"."idx_designs_mapping_name"`);
    await queryRunner.query(`DROP INDEX "public"."idx_designs_mapping_id"`);
    await queryRunner.query(`ALTER TABLE "designs" DROP COLUMN "series_size_finish_id"`);

    await queryRunner.query(`ALTER TABLE "designs" ALTER COLUMN "series_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "designs" ADD CONSTRAINT "FK_designs_series" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_designs_series_name" ON "designs" ("series_id", "name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`CREATE INDEX "idx_designs_series_id" ON "designs" ("series_id")`);

    await queryRunner.query(
      `ALTER TABLE "design_size_finish" ADD CONSTRAINT "FK_dsf_design" FOREIGN KEY ("design_id") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "design_size_finish" ADD CONSTRAINT "FK_dsf_size_finish" FOREIGN KEY ("size_finish_id") REFERENCES "size_finish"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_dsf_pair" ON "design_size_finish" ("design_id", "size_finish_id") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dsf_design_id" ON "design_size_finish" ("design_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dsf_size_finish_id" ON "design_size_finish" ("size_finish_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_dsf_size_finish_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_dsf_design_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_dsf_pair"`);
    await queryRunner.query(`ALTER TABLE "design_size_finish" DROP CONSTRAINT "FK_dsf_size_finish"`);
    await queryRunner.query(`ALTER TABLE "design_size_finish" DROP CONSTRAINT "FK_dsf_design"`);

    await queryRunner.query(`ALTER TABLE "designs" ADD COLUMN "series_size_finish_id" uuid`);
    await queryRunner.query(
      `UPDATE "designs" d SET "series_size_finish_id" = ssf."id"
         FROM "series_size_finish" ssf, "design_size_finish" dsf
         WHERE dsf."design_id" = d."id"
           AND ssf."series_id" = d."series_id"
           AND ssf."size_finish_id" = dsf."size_finish_id"
           AND dsf."deleted_at" IS NULL`,
    );
    await queryRunner.query(`DROP TABLE "design_size_finish"`);

    await queryRunner.query(`DROP INDEX "public"."idx_designs_series_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_designs_series_name"`);
    await queryRunner.query(`ALTER TABLE "designs" DROP CONSTRAINT "FK_designs_series"`);
    await queryRunner.query(`ALTER TABLE "designs" DROP COLUMN "series_id"`);
    await queryRunner.query(`ALTER TABLE "designs" DROP COLUMN "thumbnail_url"`);
    await queryRunner.query(
      `ALTER TABLE "designs" ALTER COLUMN "series_size_finish_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "designs" ADD CONSTRAINT "FK_designs_ssf" FOREIGN KEY ("series_size_finish_id") REFERENCES "series_size_finish"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_designs_mapping_name" ON "designs" ("series_size_finish_id", "name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_designs_mapping_id" ON "designs" ("series_size_finish_id")`,
    );
  }
}
