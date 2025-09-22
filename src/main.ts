import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/http-exception.filter';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  

  // Seguridad y CORS
  app.use(helmet());
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: false });


  // Request-ID 
  app.use(new RequestIdMiddleware().use);

  // Validacion global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Turnero API')
    .setDescription('API para turnos: licencias y psicofísico')
    .setVersion('1.0.0')
    .addBearerAuth() 
    .build();

  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);


  // Interceptor de logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`API running on http://localhost:${process.env.PORT ?? 3000}`);
}



bootstrap();