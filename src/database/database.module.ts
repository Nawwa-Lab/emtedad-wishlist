import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { env } from '../config/env.config'
import { Wish } from './entities/wish.entity'
import { WishEndorsement } from './entities/wish-endorsement.entity'
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...env.db,
      entities: [Wish, WishEndorsement],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Wish, WishEndorsement]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
