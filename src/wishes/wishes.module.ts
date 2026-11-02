import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Wish } from '../database/entities/wish.entity'
import { WishEndorsement } from '../database/entities/wish-endorsement.entity'
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module'
import { WishesController } from './wishes.controller'
import { WishesService } from './wishes.service'
@Module({
  imports: [TypeOrmModule.forFeature([Wish, WishEndorsement]), RabbitmqModule],
  controllers: [WishesController],
  providers: [WishesService],
})
export class WishesModule {}
