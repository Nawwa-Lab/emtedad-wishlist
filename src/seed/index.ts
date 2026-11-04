import 'reflect-metadata'
import { Module } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { readFileSync } from 'node:fs'
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm'
import { DatabaseModule } from '../database/database.module'
import { WishEndorsement } from '../database/entities/wish-endorsement.entity'
import { Wish } from '../database/entities/wish.entity'

@Module({ imports: [DatabaseModule] })
export class SeedModule {}

async function seed() {
  if (process.env.NODE_ENV !== 'development') throw new Error('Seeds require NODE_ENV=development')
  const manifest = JSON.parse(
    readFileSync(process.env.DEV_FIXTURES_PATH || '/fixtures/development.json', 'utf8'),
  )
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error'] })
  try {
    const db = app.get(DataSource)
    if (db.options.database !== 'emtedad_wishlist')
      throw new Error('Unexpected development database')
    const entities: Record<string, EntityTarget<ObjectLiteral>> = { Wish, WishEndorsement }
    const mutableFields: Record<string, string[]> = {
      Wish: ['title', 'normalizedTitle', 'category', 'description', 'impact'],
    }
    let inserted = 0
    let updated = 0
    await db.transaction(async (manager) => {
      // Serialize seed processes without affecting ordinary application transactions.
      await manager.query('SELECT pg_advisory_xact_lock(820261025)')
      const collections = manifest.services.wishlist as Record<string, Record<string, unknown>[]>
      for (const [name, rows] of Object.entries(collections)) {
        const repository = manager.getRepository(entities[name])
        const primary = repository.metadata.primaryColumns[0].propertyName
        for (const row of rows) {
          const existing = await repository.findOneBy({ [primary]: row[primary] })
          if (!existing) {
            await repository.save(repository.create(row))
            inserted += 1
          } else {
            const fields = mutableFields[name] ?? []
            const changed = fields.some(
              (field) => JSON.stringify(existing[field]) !== JSON.stringify(row[field]),
            )
            if (changed) {
              for (const field of fields) existing[field] = row[field]
              await repository.save(existing)
              updated += 1
            }
          }
        }
      }
      for (const [name, rows] of Object.entries(collections)) {
        const repository = manager.getRepository(entities[name])
        const primary = repository.metadata.primaryColumns[0].propertyName
        for (const row of rows) {
          const persisted = await repository.findOneByOrFail({ [primary]: row[primary] })
          for (const [key, value] of Object.entries(row)) {
            if (key.endsWith('Id') && persisted[key] !== value) {
              throw new Error(`Fixture reference changed: ${name}.${key}`)
            }
          }
        }
      }
    })
    console.log(
      'wishlist: ' +
        inserted +
        ' fixtures inserted; ' +
        updated +
        ' fixture display rows updated; references verified',
    )
  } finally {
    await app.close()
  }
}
seed().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
