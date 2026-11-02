import { getMetadataArgsStorage } from 'typeorm'
import { Wish } from './wish.entity'
import { WishEndorsement } from './wish-endorsement.entity'

describe('wishlist entity mappings', () => {
  it.each([
    [Wish, 'wishId', 'wish_id'],
    [WishEndorsement, 'endorsementId', 'endorsement_id'],
  ])('maps %p.%s to %s', (target, propertyName, databaseName) => {
    const column = getMetadataArgsStorage().columns.find(
      (candidate) => candidate.target === target && candidate.propertyName === propertyName,
    )

    expect(column?.options.name).toBe(databaseName)
  })
})
