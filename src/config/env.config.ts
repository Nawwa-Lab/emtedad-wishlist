import dotenv from 'dotenv'
dotenv.config()
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4007,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  swaggerPath: process.env.SWAGGER_PATH || 'api/docs',
  sourceName: process.env.SOURCE_NAME || 'wishlist-service',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'emtedad_wishlist',
    password: process.env.DB_PASSWORD || 'wishlist_dev_secret',
    database: process.env.DB_DATABASE || 'emtedad_wishlist',
  },
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: Number(process.env.RABBITMQ_PORT) || 5672,
  },
}
export const RABBITMQ_URL = `amqp://${env.rabbitmq.host}:${env.rabbitmq.port}`
