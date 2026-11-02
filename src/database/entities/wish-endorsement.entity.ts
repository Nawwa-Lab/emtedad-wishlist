import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Wish } from './wish.entity'
@Entity('wish_endorsements')
@Check(
  `("endorser_org_id" IS NOT NULL AND "endorser_user_id" IS NULL) OR ("endorser_user_id" IS NOT NULL AND "endorser_org_id" IS NULL)`,
)
@Index(['wishId', 'endorserOrgId'], { unique: true, where: 'endorser_org_id IS NOT NULL' })
@Index(['wishId', 'endorserUserId'], { unique: true, where: 'endorser_user_id IS NOT NULL' })
export class WishEndorsement {
  @PrimaryGeneratedColumn('uuid', { name: 'endorsement_id' }) endorsementId: string
  @Column({ name: 'wish_id', type: 'uuid' }) wishId: string
  @ManyToOne(() => Wish, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'wish_id' }) wish: Wish
  @Column({ name: 'endorser_org_id', type: 'uuid', nullable: true }) endorserOrgId: string | null
  @Column({ name: 'endorser_user_id', type: 'uuid', nullable: true }) endorserUserId: string | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}
