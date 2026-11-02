import { MigrationInterface, QueryRunner } from 'typeorm'
export class CreateWishlist1761500000000 implements MigrationInterface {
  name = 'CreateWishlist1761500000000'
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TYPE "wish_family_enum" AS ENUM ('network','community')`)
    await q.query(`CREATE TYPE "wish_status_enum" AS ENUM ('active','withdrawn')`)
    await q.query(
      `CREATE TABLE "wishes" ("wish_id" uuid NOT NULL DEFAULT gen_random_uuid(), "family" "wish_family_enum" NOT NULL, "status" "wish_status_enum" NOT NULL DEFAULT 'active', "title" varchar(160) NOT NULL, "normalized_title" varchar(160) NOT NULL, "category" varchar(50) NOT NULL, "description" text NOT NULL, "impact" text, "owner_org_id" uuid, "owner_user_id" uuid, "locked_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "CHK_wish_owner" CHECK ((family = 'network' AND owner_org_id IS NOT NULL AND owner_user_id IS NULL) OR (family = 'community' AND owner_user_id IS NOT NULL AND owner_org_id IS NULL)), CONSTRAINT "PK_wishes" PRIMARY KEY ("wish_id"))`,
    )
    await q.query(
      `CREATE UNIQUE INDEX "IDX_active_wish_title" ON "wishes" ("family", "normalized_title") WHERE status = 'active'`,
    )
    await q.query(`CREATE INDEX "IDX_wish_browse" ON "wishes" ("family", "status", "created_at")`)
    await q.query(
      `CREATE TABLE "wish_endorsements" ("endorsement_id" uuid NOT NULL DEFAULT gen_random_uuid(), "wish_id" uuid NOT NULL, "endorser_org_id" uuid, "endorser_user_id" uuid, "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "CHK_endorser" CHECK ((endorser_org_id IS NOT NULL AND endorser_user_id IS NULL) OR (endorser_user_id IS NOT NULL AND endorser_org_id IS NULL)), CONSTRAINT "PK_endorsements" PRIMARY KEY ("endorsement_id"), CONSTRAINT "FK_endorsement_wish" FOREIGN KEY ("wish_id") REFERENCES "wishes"("wish_id") ON DELETE CASCADE)`,
    )
    await q.query(
      `CREATE UNIQUE INDEX "IDX_org_endorsement" ON "wish_endorsements" ("wish_id", "endorser_org_id") WHERE endorser_org_id IS NOT NULL`,
    )
    await q.query(
      `CREATE UNIQUE INDEX "IDX_user_endorsement" ON "wish_endorsements" ("wish_id", "endorser_user_id") WHERE endorser_user_id IS NOT NULL`,
    )
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "wish_endorsements"`)
    await q.query(`DROP TABLE "wishes"`)
    await q.query(`DROP TYPE "wish_status_enum"`)
    await q.query(`DROP TYPE "wish_family_enum"`)
  }
}
