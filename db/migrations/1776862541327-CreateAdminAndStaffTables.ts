import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAdminAndStaffTables1776862541327 implements MigrationInterface {
    name = 'CreateAdminAndStaffTables1776862541327'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "role_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role_id" uuid NOT NULL, "module" character varying NOT NULL, "can_read" boolean NOT NULL DEFAULT false, "can_write" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_role_permissions_role_module" UNIQUE ("role_id", "module"), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_role_permissions_role_id" ON "role_permissions" ("role_id") `);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_roles_name" ON "roles" ("name") WHERE deleted_at IS NULL`);
        await queryRunner.query(`CREATE TABLE "staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(20) NOT NULL, "password_hash" character varying NOT NULL, "role_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_e4ee98bb552756c180aec1e854a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_staff_is_active" ON "staff" ("is_active") `);
        await queryRunner.query(`CREATE INDEX "idx_staff_role_id" ON "staff" ("role_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_staff_email" ON "staff" ("email") WHERE deleted_at IS NULL`);
        await queryRunner.query(`CREATE TABLE "admins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(20) NOT NULL, "password_hash" character varying NOT NULL, "is_super_admin" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_admins_is_active" ON "admins" ("is_active") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_admins_email" ON "admins" ("email") WHERE deleted_at IS NULL`);
        await queryRunner.query(`CREATE TABLE "staff_security_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "staff_id" uuid, "staff_name" character varying, "action_type" character varying NOT NULL, "description" text, "ip" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c48e5a0135975c8285da6594604" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_staff_security_logs_created_at" ON "staff_security_logs" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_staff_security_logs_action_type" ON "staff_security_logs" ("action_type") `);
        await queryRunner.query(`CREATE INDEX "idx_staff_security_logs_staff_id" ON "staff_security_logs" ("staff_id") `);
        await queryRunner.query(`CREATE TABLE "staff_refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "staff_id" uuid NOT NULL, "token_hash" character varying NOT NULL, "device_id" character varying, "ip" character varying, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_93a8aade9a05723e493338fa883" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_staff_refresh_tokens_expires_at" ON "staff_refresh_tokens" ("expires_at") `);
        await queryRunner.query(`CREATE INDEX "idx_staff_refresh_tokens_token_hash" ON "staff_refresh_tokens" ("token_hash") `);
        await queryRunner.query(`CREATE INDEX "idx_staff_refresh_tokens_staff_id" ON "staff_refresh_tokens" ("staff_id") `);
        await queryRunner.query(`CREATE TABLE "admin_security_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "admin_id" uuid, "admin_name" character varying, "action_type" character varying NOT NULL, "description" text, "ip" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e9fa91fe0ff6b36cc82a08490c1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_admin_security_logs_created_at" ON "admin_security_logs" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_admin_security_logs_action_type" ON "admin_security_logs" ("action_type") `);
        await queryRunner.query(`CREATE INDEX "idx_admin_security_logs_admin_id" ON "admin_security_logs" ("admin_id") `);
        await queryRunner.query(`CREATE TABLE "admin_refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "admin_id" uuid NOT NULL, "token_hash" character varying NOT NULL, "device_id" character varying, "ip" character varying, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_341c4a1fa29fa0017ed8ad0791f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_admin_refresh_tokens_expires_at" ON "admin_refresh_tokens" ("expires_at") `);
        await queryRunner.query(`CREATE INDEX "idx_admin_refresh_tokens_token_hash" ON "admin_refresh_tokens" ("token_hash") `);
        await queryRunner.query(`CREATE INDEX "idx_admin_refresh_tokens_admin_id" ON "admin_refresh_tokens" ("admin_id") `);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staff" ADD CONSTRAINT "FK_c3fe01125c99573751fe5e55666" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staff_security_logs" ADD CONSTRAINT "FK_c692e3ea95b56928043bb60a942" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staff_refresh_tokens" ADD CONSTRAINT "FK_a8a1ae310391e175124623e1850" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "admin_security_logs" ADD CONSTRAINT "FK_76ffde0d49c993040f230ef87d5" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "FK_1bd01666a593d39ddf07f011405" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_refresh_tokens" DROP CONSTRAINT "FK_1bd01666a593d39ddf07f011405"`);
        await queryRunner.query(`ALTER TABLE "admin_security_logs" DROP CONSTRAINT "FK_76ffde0d49c993040f230ef87d5"`);
        await queryRunner.query(`ALTER TABLE "staff_refresh_tokens" DROP CONSTRAINT "FK_a8a1ae310391e175124623e1850"`);
        await queryRunner.query(`ALTER TABLE "staff_security_logs" DROP CONSTRAINT "FK_c692e3ea95b56928043bb60a942"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_c3fe01125c99573751fe5e55666"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
        await queryRunner.query(`DROP INDEX "public"."idx_admin_refresh_tokens_admin_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_admin_refresh_tokens_token_hash"`);
        await queryRunner.query(`DROP INDEX "public"."idx_admin_refresh_tokens_expires_at"`);
        await queryRunner.query(`DROP TABLE "admin_refresh_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."idx_admin_security_logs_admin_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_admin_security_logs_action_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_admin_security_logs_created_at"`);
        await queryRunner.query(`DROP TABLE "admin_security_logs"`);
        await queryRunner.query(`DROP INDEX "public"."idx_staff_refresh_tokens_staff_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_staff_refresh_tokens_token_hash"`);
        await queryRunner.query(`DROP INDEX "public"."idx_staff_refresh_tokens_expires_at"`);
        await queryRunner.query(`DROP TABLE "staff_refresh_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."idx_staff_security_logs_staff_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_staff_security_logs_action_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_staff_security_logs_created_at"`);
        await queryRunner.query(`DROP TABLE "staff_security_logs"`);
        await queryRunner.query(`DROP INDEX "public"."idx_admins_email"`);
        await queryRunner.query(`DROP INDEX "public"."idx_admins_is_active"`);
        await queryRunner.query(`DROP TABLE "admins"`);
        await queryRunner.query(`DROP INDEX "public"."idx_staff_email"`);
        await queryRunner.query(`DROP INDEX "public"."idx_staff_role_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_staff_is_active"`);
        await queryRunner.query(`DROP TABLE "staff"`);
        await queryRunner.query(`DROP INDEX "public"."idx_roles_name"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP INDEX "public"."idx_role_permissions_role_id"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
    }

}
