import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { Wish, WishFamily } from '../database/entities/wish.entity'
import { WishEndorsement } from '../database/entities/wish-endorsement.entity'
import { RabbitmqService } from '../rabbitmq/rabbitmq.service'
import { WishesService } from './wishes.service'

describe('WishesService authorization', () => {
  const wishes = {
    create: jest.fn((wish) => ({
      ...wish,
      wishId: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    save: jest.fn(async (wish) => wish),
    query: jest.fn(async () => [{ category: 'Health' }, { category: 'Training · Legal aid' }]),
  }
  const service = new WishesService(
    wishes as unknown as Repository<Wish>,
    {} as Repository<WishEndorsement>,
    {} as DataSource,
    { publishEvent: jest.fn() } as unknown as RabbitmqService,
  )
  const dto = { title: 'Legal aid', category: ['legal'], description: 'A missing legal service' }

  it('allows only organization admins to create network wishes', async () => {
    await expect(
      service.create(
        WishFamily.NETWORK,
        { ...dto, impact: 'Strengthens the network' },
        { userId: crypto.randomUUID(), orgId: crypto.randomUUID(), role: 'team_worker' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('requires impact for network wishes', async () => {
    await expect(
      service.create(WishFamily.NETWORK, dto, {
        userId: crypto.randomUUID(),
        orgId: crypto.randomUUID(),
        role: 'org_admin',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it.each(['community_member', 'org_admin', 'team_worker'])(
    'allows %s to create a personal community wish',
    async (role) => {
      await expect(
        service.create(WishFamily.COMMUNITY, dto, {
          userId: crypto.randomUUID(),
          role,
        }),
      ).resolves.toMatchObject({ family: WishFamily.COMMUNITY, canEdit: true })
    },
  )

  it('does not give the Emtedad Team a personal community identity', async () => {
    await expect(
      service.create(WishFamily.COMMUNITY, dto, {
        userId: crypto.randomUUID(),
        role: 'emtedad_admin',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('lists distinct stored categories', async () => {
    await expect(
      service.categories(WishFamily.COMMUNITY, {
        userId: crypto.randomUUID(),
        role: 'community_member',
      }),
    ).resolves.toEqual(['Health', 'Legal aid', 'Training'])
  })
})
