import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { env } from '../config/env.config'
import { Wish } from './entities/wish.entity'
import { WishEndorsement } from './entities/wish-endorsement.entity'
export default new DataSource({
  type: 'postgres',
  ...env.db,
  entities: [Wish, WishEndorsement],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
})
