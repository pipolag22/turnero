import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: true, credentials: true }, // habilita CORS amplio
  });

  // Validaciones en todos los endpoints 
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Cierre limpio 
  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`API running on http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
