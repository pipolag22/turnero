import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { OpsModule } from './ops/ops.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PublicModule } from './public/public.module';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        level: process.env.LOG_LEVEL ?? 'info',
        autoLogging: true,
        customProps: (req) => ({ requestId: req.headers['x-request-id'] }),
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TicketsModule,
    OpsModule,
    RealtimeModule,
    PublicModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
