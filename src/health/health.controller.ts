import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { RabbitmqService } from '../rabbitmq/rabbitmq.service'
@Controller()
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rabbitmq: RabbitmqService,
  ) {}
  @Get('health') health() {
    return { status: 'ok', service: 'wishlist-service', timestamp: new Date().toISOString() }
  }
  @Get('ready') async ready() {
    try {
      await this.dataSource.query('SELECT 1')
      if (!this.rabbitmq.isReady()) throw new Error('RabbitMQ unavailable')
      return {
        status: 'ready',
        service: 'wishlist-service',
        timestamp: new Date().toISOString(),
      }
    } catch {
      throw new ServiceUnavailableException('Wishlist service is not ready')
    }
  }
}
