import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { env } from './config/env.config'
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableShutdownHooks()
  app.setGlobalPrefix(env.apiPrefix)
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  )
  if (env.nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Emtedad Wishlist Service')
      .setDescription('Genny and Shbeik Lbeik wish APIs')
      .setVersion('1.0')
      .addTag('wishes')
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup(env.swaggerPath, app, document)
  }
  await app.listen(env.port)
}
void bootstrap()
