import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, QueryFailedError, Repository } from 'typeorm'
import { WishEndorsement } from '../database/entities/wish-endorsement.entity'
import { Wish, WishFamily, WishStatus } from '../database/entities/wish.entity'
import { RabbitmqService } from '../rabbitmq/rabbitmq.service'
import { BrowseWishesDto, CreateWishDto, UpdateWishDto, WISH_TAG_PATTERN } from './dto/wish.dto'
import { normalizeTitle } from './normalize-title'

export type Actor = { userId: string; orgId?: string; role: string }

@Injectable()
export class WishesService {
  constructor(
    @InjectRepository(Wish) private readonly wishes: Repository<Wish>,
    @InjectRepository(WishEndorsement)
    private readonly endorsements: Repository<WishEndorsement>,
    private readonly dataSource: DataSource,
    private readonly rabbitmq: RabbitmqService,
  ) {}

  private validateActor(family: WishFamily, actor: Actor, writing = false) {
    if (!actor.userId) throw new ForbiddenException('Missing user identity')
    if (family === WishFamily.NETWORK) {
      if (!actor.orgId) throw new ForbiddenException('Organization context is required')
      if (writing && !['org_admin', 'emtedad_admin'].includes(actor.role))
        throw new ForbiddenException('Organization admin role required')
    } else if (writing && !['community_member', 'org_admin', 'team_worker'].includes(actor.role))
      throw new ForbiddenException('Community member role required')
  }

  private owns(wish: Wish, actor: Actor) {
    return wish.family === WishFamily.NETWORK
      ? wish.ownerOrgId === actor.orgId
      : wish.ownerUserId === actor.userId
  }
  private actorWhere(family: WishFamily, actor: Actor) {
    return family === WishFamily.NETWORK
      ? { endorserOrgId: actor.orgId! }
      : { endorserUserId: actor.userId }
  }

  async browse(family: WishFamily, query: BrowseWishesDto, actor: Actor) {
    this.validateActor(family, actor)
    const qb = this.wishes
      .createQueryBuilder('w')
      .leftJoin(WishEndorsement, 'e', 'e.wishId = w.wishId')
      .addSelect('COUNT(e.endorsementId)', 'endorsementCount')
      .where('w.family = :family AND w.status = :status', {
        family,
        status: WishStatus.ACTIVE,
      })
      .groupBy('w.wishId')
    const countQb = this.wishes
      .createQueryBuilder('w')
      .where('w.family = :family AND w.status = :status', {
        family,
        status: WishStatus.ACTIVE,
      })
    if (query.category) {
      qb.andWhere(':category = ANY(w.category)', { category: query.category })
      countQb.andWhere(':category = ANY(w.category)', { category: query.category })
    }
    if (query.q) {
      const q = `%${query.q.trim()}%`
      qb.andWhere('(w.title ILIKE :q OR w.description ILIKE :q)', { q })
      countQb.andWhere('(w.title ILIKE :q OR w.description ILIKE :q)', { q })
    }
    qb.orderBy(query.sort === 'most_endorsed' ? '"endorsementCount"' : 'w.createdAt', 'DESC')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
    const [rows, total] = await Promise.all([qb.getRawAndEntities(), countQb.getCount()])
    const endorsedIds = new Set(
      (
        await this.endorsements.find({
          where: this.actorWhere(family, actor),
          select: { wishId: true },
        })
      ).map((e) => e.wishId),
    )
    return {
      items: rows.entities.map((wish, index) =>
        this.present(
          wish,
          Number(rows.raw[index]?.endorsementCount ?? 0),
          endorsedIds.has(wish.wishId),
          actor,
        ),
      ),
      page: query.page,
      limit: query.limit,
      total,
    }
  }

  async mine(family: WishFamily, actor: Actor) {
    this.validateActor(family, actor, true)
    const ownerField = family === WishFamily.NETWORK ? 'w.ownerOrgId' : 'w.ownerUserId'
    const ownerId = family === WishFamily.NETWORK ? actor.orgId : actor.userId
    const qb = this.wishes
      .createQueryBuilder('w')
      .leftJoin(WishEndorsement, 'e', 'e.wishId = w.wishId')
      .addSelect('COUNT(e.endorsementId)', 'endorsementCount')
      .where('w.family = :family AND w.status = :status', {
        family,
        status: WishStatus.ACTIVE,
      })
    if (family === WishFamily.COMMUNITY)
      qb.andWhere(
        `(${ownerField} = :ownerId OR EXISTS (SELECT 1 FROM wish_endorsements me WHERE me.wish_id = w.wish_id AND me.endorser_user_id = :ownerId))`,
        { ownerId },
      )
    else qb.andWhere(`${ownerField} = :ownerId`, { ownerId })
    const rows = await qb.groupBy('w.wishId').orderBy('w.createdAt', 'DESC').getRawAndEntities()
    return rows.entities.map((wish, index) =>
      this.present(wish, Number(rows.raw[index]?.endorsementCount ?? 0), false, actor),
    )
  }

  async categories(family: WishFamily, actor: Actor) {
    this.validateActor(family, actor)
    const rows = (await this.wishes.query(
      `SELECT DISTINCT unnest("category") AS "category" FROM "wishes" WHERE "family" = $1 AND "status" = $2 ORDER BY "category"`,
      [family, WishStatus.ACTIVE],
    )) as Array<{ category: string }>
    return Array.from(
      new Set(
        rows
          .flatMap((row) => row.category.split(/\s*[·,]\s*/))
          .map((category) => category.trim())
          .filter((category) => WISH_TAG_PATTERN.test(category)),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }

  async findOne(family: WishFamily, id: string, actor: Actor) {
    this.validateActor(family, actor)
    const wish = await this.wishes.findOne({
      where: { wishId: id, family, status: WishStatus.ACTIVE },
    })
    if (!wish) throw new NotFoundException('Wish not found')
    const [count, endorsed] = await Promise.all([
      this.endorsements.countBy({ wishId: id }),
      this.endorsements.exists({
        where: { wishId: id, ...this.actorWhere(family, actor) },
      }),
    ])
    return this.present(wish, count, endorsed, actor)
  }

  async create(family: WishFamily, dto: CreateWishDto, actor: Actor) {
    this.validateActor(family, actor, true)
    if (family === WishFamily.NETWORK && !dto.impact)
      throw new BadRequestException('Impact is required for network wishes')
    try {
      const saved = await this.wishes.save(
        this.wishes.create({
          ...dto,
          impact: dto.impact || null,
          family,
          normalizedTitle: normalizeTitle(dto.title),
          status: WishStatus.ACTIVE,
          ownerOrgId: family === WishFamily.NETWORK ? actor.orgId! : null,
          ownerUserId: family === WishFamily.COMMUNITY ? actor.userId : null,
          lockedAt: null,
        }),
      )
      await this.rabbitmq.publishEvent(
        'wish.created',
        { wishId: saved.wishId, family, category: saved.category },
        actor,
      )
      return this.present(saved, 0, false, actor)
    } catch (error) {
      this.rethrowConflict(error, 'An active wish with this title already exists')
    }
  }

  async update(family: WishFamily, id: string, dto: UpdateWishDto, actor: Actor) {
    const wish = await this.getOwned(family, id, actor)
    if (wish.lockedAt) throw new ConflictException('Wish is locked after its first endorsement')
    if (family === WishFamily.NETWORK && dto.impact === '')
      throw new BadRequestException('Impact is required for network wishes')
    Object.assign(wish, dto)
    if (dto.title) wish.normalizedTitle = normalizeTitle(dto.title)
    try {
      const saved = await this.wishes.save(wish)
      await this.rabbitmq.publishEvent(
        'wish.updated',
        { wishId: id, family, category: saved.category },
        actor,
      )
      return this.present(saved, 0, false, actor)
    } catch (error) {
      this.rethrowConflict(error, 'An active wish with this title already exists')
    }
  }

  async remove(family: WishFamily, id: string, actor: Actor) {
    const wish = await this.getOwned(family, id, actor)
    if (wish.lockedAt) {
      wish.status = WishStatus.WITHDRAWN
      await this.wishes.save(wish)
      await this.rabbitmq.publishEvent('wish.withdrawn', { wishId: id, family }, actor)
    } else {
      await this.wishes.remove(wish)
      await this.rabbitmq.publishEvent('wish.deleted', { wishId: id, family }, actor)
    }
  }

  async endorse(family: WishFamily, id: string, actor: Actor) {
    this.validateActor(family, actor, true)
    const count = await this.dataSource.transaction(async (manager) => {
      const wish = await manager.findOne(Wish, {
        where: { wishId: id, family, status: WishStatus.ACTIVE },
        lock: { mode: 'pessimistic_write' },
      })
      if (!wish) throw new NotFoundException('Wish not found')
      if (this.owns(wish, actor))
        throw new ConflictException('Creators cannot endorse their own wish')
      try {
        await manager.save(
          WishEndorsement,
          manager.create(WishEndorsement, {
            wishId: id,
            endorserOrgId: family === WishFamily.NETWORK ? actor.orgId! : null,
            endorserUserId: family === WishFamily.COMMUNITY ? actor.userId : null,
          }),
        )
      } catch (error) {
        this.rethrowConflict(error, 'Wish already endorsed')
      }
      if (!wish.lockedAt) {
        wish.lockedAt = new Date()
        await manager.save(wish)
      }
      return manager.count(WishEndorsement, { where: { wishId: id } })
    })
    await this.rabbitmq.publishEvent(
      'wish.endorsed',
      { wishId: id, family, endorsementCount: count },
      actor,
    )
    return { endorsementCount: count, endorsedByMe: true }
  }

  async unendorse(family: WishFamily, id: string, actor: Actor) {
    this.validateActor(family, actor, true)
    await this.wishes.findOneByOrFail({ wishId: id, family })
    await this.endorsements.delete({
      wishId: id,
      ...this.actorWhere(family, actor),
    })
    const count = await this.endorsements.countBy({ wishId: id })
    await this.rabbitmq.publishEvent(
      'wish.endorsement_removed',
      { wishId: id, family, endorsementCount: count },
      actor,
    )
    return { endorsementCount: count, endorsedByMe: false }
  }

  async endorsers(family: WishFamily, id: string, actor: Actor) {
    this.validateActor(family, actor)
    await this.wishes.findOneByOrFail({ wishId: id, family })
    const rows = await this.endorsements.findBy({ wishId: id })
    return rows.map((e) => ({
      actorType: family === WishFamily.NETWORK ? 'organization' : 'member',
      actorId: e.endorserOrgId ?? e.endorserUserId,
    }))
  }

  private async getOwned(family: WishFamily, id: string, actor: Actor) {
    this.validateActor(family, actor, true)
    const wish = await this.wishes.findOneBy({
      wishId: id,
      family,
      status: WishStatus.ACTIVE,
    })
    if (!wish) throw new NotFoundException('Wish not found')
    if (!this.owns(wish, actor)) throw new ForbiddenException('Only the owner can change this wish')
    return wish
  }
  private present(wish: Wish, endorsementCount: number, endorsedByMe: boolean, actor: Actor) {
    const owned = this.owns(wish, actor)
    return {
      id: wish.wishId,
      family: wish.family,
      status: wish.status,
      title: wish.title,
      category: wish.category,
      description: wish.description,
      impact: wish.impact,
      ownerOrgId: wish.ownerOrgId,
      ownerUserId: wish.ownerUserId,
      createdAt: wish.createdAt,
      updatedAt: wish.updatedAt,
      endorsementCount,
      endorsedByMe,
      locked: Boolean(wish.lockedAt),
      canEdit: owned && !wish.lockedAt,
      canDelete: owned && !wish.lockedAt,
      canWithdraw: owned && Boolean(wish.lockedAt),
    }
  }
  private rethrowConflict(error: unknown, message: string): never {
    if (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code ===
        '23505'
    )
      throw new ConflictException(message)
    throw error
  }
}
