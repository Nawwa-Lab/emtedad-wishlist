import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Channel, ChannelModel, connect } from 'amqplib'
import * as crypto from 'crypto'
import { env, RABBITMQ_URL } from '../config/env.config'

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private connection?: ChannelModel
  private channel?: Channel
  private readonly logger = new Logger(RabbitmqService.name)

  async onModuleInit() {
    this.connection = await connect(RABBITMQ_URL)
    this.channel = await this.connection.createChannel()
    await this.channel.assertExchange('domain.events', 'topic', { durable: true })
  }

  isReady() {
    return Boolean(this.channel)
  }

  async publishEvent(
    routingKey: string,
    payload: Record<string, unknown>,
    metadata: Record<string, string | undefined> = {},
  ) {
    if (!this.channel) throw new Error('RabbitMQ is not ready')
    const event = {
      eventId: crypto.randomUUID(),
      eventType: routingKey,
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
      source: env.sourceName,
      payload,
      metadata,
    }
    this.channel.publish('domain.events', routingKey, Buffer.from(JSON.stringify(event)), {
      persistent: true,
    })
    this.logger.log(`Published ${routingKey}`)
  }

  async onModuleDestroy() {
    await this.channel?.close()
    await this.connection?.close()
  }
}
