import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  // Allow development origins (echo back the request origin). In production,
  // replace this with a specific origin or a whitelist.
  app.enableCors({ origin: true, credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  const config = app.get(ConfigService)
  const port = config.get<number>('PORT') ?? 4000
  await app.listen(port)
  console.log(`Backend is listening at http://localhost:${port}`)
}

bootstrap()
