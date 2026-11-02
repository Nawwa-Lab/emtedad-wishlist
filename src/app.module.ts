import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'
import { RabbitmqModule } from './rabbitmq/rabbitmq.module'
import { WishesModule } from './wishes/wishes.module'
@Module({ imports: [DatabaseModule, RabbitmqModule, HealthModule, WishesModule] })
export class AppModule {}
