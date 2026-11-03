import { ServiceUnavailableException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { RabbitmqService } from '../rabbitmq/rabbitmq.service'
import { HealthController } from './health.controller'

describe('HealthController', () => {
  const dataSource = { query: jest.fn() }
  const rabbitmq = { isReady: jest.fn() }
  const controller = new HealthController(
    dataSource as unknown as DataSource,
    rabbitmq as unknown as RabbitmqService,
  )

  beforeEach(() => {
    dataSource.query.mockResolvedValue([])
    rabbitmq.isReady.mockReturnValue(true)
  })

  it('reports liveness', () => {
    expect(controller.health()).toMatchObject({ status: 'ok', service: 'wishlist-service' })
  })

  it('reports readiness', async () => {
    await expect(controller.ready()).resolves.toMatchObject({ status: 'ready' })
  })

  it('reports unavailable dependencies', async () => {
    rabbitmq.isReady.mockReturnValue(false)
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
