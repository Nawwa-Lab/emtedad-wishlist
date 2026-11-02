import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
export enum WishFamily {
  NETWORK = 'network',
  COMMUNITY = 'community',
}
export enum WishStatus {
  ACTIVE = 'active',
  WITHDRAWN = 'withdrawn',
}
@Entity('wishes')
@Check(
  `("family" = 'network' AND "owner_org_id" IS NOT NULL AND "owner_user_id" IS NULL) OR ("family" = 'community' AND "owner_user_id" IS NOT NULL AND "owner_org_id" IS NULL)`,
)
@Index(['family', 'normalizedTitle'], { unique: true, where: `status = 'active'` })
@Index(['family', 'status', 'createdAt'])
export class Wish {
  @PrimaryGeneratedColumn('uuid', { name: 'wish_id' }) wishId: string
  @Column({ type: 'enum', enum: WishFamily }) family: WishFamily
  @Column({ type: 'enum', enum: WishStatus, default: WishStatus.ACTIVE }) status: WishStatus
  @Column({ length: 160 }) title: string
  @Column({ name: 'normalized_title', length: 160 }) normalizedTitle: string
  @Column({ type: 'varchar', length: 50, array: true }) category: string[]
  @Column({ type: 'text' }) description: string
  @Column({ type: 'text', nullable: true }) impact: string | null
  @Column({ name: 'owner_org_id', type: 'uuid', nullable: true }) ownerOrgId: string | null
  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true }) ownerUserId: string | null
  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true }) lockedAt: Date | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
}
