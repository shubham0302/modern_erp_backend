import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryTables1777000000000 implements MigrationInterface {
  name = 'CreateInventoryTables1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // sizes
    await queryRunner.query(
      `CREATE TABLE "sizes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_sizes" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_sizes_name" ON "sizes" ("name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`CREATE INDEX "idx_sizes_is_active" ON "sizes" ("is_active") `);

    // finishes
    await queryRunner.query(
      `CREATE TABLE "finishes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_finishes" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_finishes_name" ON "finishes" ("name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`CREATE INDEX "idx_finishes_is_active" ON "finishes" ("is_active") `);

    // series
    await queryRunner.query(
      `CREATE TABLE "series" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_series" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_series_name" ON "series" ("name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`CREATE INDEX "idx_series_is_active" ON "series" ("is_active") `);

    // size_finish (junction)
    await queryRunner.query(
      `CREATE TABLE "size_finish" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "size_id" uuid NOT NULL, "finish_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_size_finish" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_size_finish_pair" ON "size_finish" ("size_id", "finish_id") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_size_finish_size_id" ON "size_finish" ("size_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_size_finish_finish_id" ON "size_finish" ("finish_id") `,
    );

    // series_size_finish (junction)
    await queryRunner.query(
      `CREATE TABLE "series_size_finish" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "series_id" uuid NOT NULL, "size_finish_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_series_size_finish" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_ssf_pair" ON "series_size_finish" ("series_id", "size_finish_id") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ssf_series_id" ON "series_size_finish" ("series_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ssf_size_finish_id" ON "series_size_finish" ("size_finish_id") `,
    );

    // designs
    await queryRunner.query(
      `CREATE TABLE "designs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "series_size_finish_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_designs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_designs_mapping_name" ON "designs" ("series_size_finish_id", "name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_designs_mapping_id" ON "designs" ("series_size_finish_id") `,
    );
    await queryRunner.query(`CREATE INDEX "idx_designs_is_active" ON "designs" ("is_active") `);

    // Foreign keys
    await queryRunner.query(
      `ALTER TABLE "size_finish" ADD CONSTRAINT "FK_size_finish_size" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "size_finish" ADD CONSTRAINT "FK_size_finish_finish" FOREIGN KEY ("finish_id") REFERENCES "finishes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "series_size_finish" ADD CONSTRAINT "FK_ssf_series" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "series_size_finish" ADD CONSTRAINT "FK_ssf_size_finish" FOREIGN KEY ("size_finish_id") REFERENCES "size_finish"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "designs" ADD CONSTRAINT "FK_designs_ssf" FOREIGN KEY ("series_size_finish_id") REFERENCES "series_size_finish"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "designs" DROP CONSTRAINT "FK_designs_ssf"`);
    await queryRunner.query(
      `ALTER TABLE "series_size_finish" DROP CONSTRAINT "FK_ssf_size_finish"`,
    );
    await queryRunner.query(`ALTER TABLE "series_size_finish" DROP CONSTRAINT "FK_ssf_series"`);
    await queryRunner.query(`ALTER TABLE "size_finish" DROP CONSTRAINT "FK_size_finish_finish"`);
    await queryRunner.query(`ALTER TABLE "size_finish" DROP CONSTRAINT "FK_size_finish_size"`);

    await queryRunner.query(`DROP INDEX "public"."idx_designs_is_active"`);
    await queryRunner.query(`DROP INDEX "public"."idx_designs_mapping_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_designs_mapping_name"`);
    await queryRunner.query(`DROP TABLE "designs"`);

    await queryRunner.query(`DROP INDEX "public"."idx_ssf_size_finish_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ssf_series_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ssf_pair"`);
    await queryRunner.query(`DROP TABLE "series_size_finish"`);

    await queryRunner.query(`DROP INDEX "public"."idx_size_finish_finish_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_size_finish_size_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_size_finish_pair"`);
    await queryRunner.query(`DROP TABLE "size_finish"`);

    await queryRunner.query(`DROP INDEX "public"."idx_series_is_active"`);
    await queryRunner.query(`DROP INDEX "public"."idx_series_name"`);
    await queryRunner.query(`DROP TABLE "series"`);

    await queryRunner.query(`DROP INDEX "public"."idx_finishes_is_active"`);
    await queryRunner.query(`DROP INDEX "public"."idx_finishes_name"`);
    await queryRunner.query(`DROP TABLE "finishes"`);

    await queryRunner.query(`DROP INDEX "public"."idx_sizes_is_active"`);
    await queryRunner.query(`DROP INDEX "public"."idx_sizes_name"`);
    await queryRunner.query(`DROP TABLE "sizes"`);
  }
}
