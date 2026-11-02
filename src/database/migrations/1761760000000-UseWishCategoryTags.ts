import { MigrationInterface, QueryRunner } from 'typeorm'

export class UseWishCategoryTags1761760000000 implements MigrationInterface {
  name = 'UseWishCategoryTags1761760000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wishes" ALTER COLUMN "category" TYPE varchar(50)[] USING ARRAY["category"]`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wishes" ALTER COLUMN "category" TYPE varchar(50) USING "category"[1]`,
    )
  }
}
