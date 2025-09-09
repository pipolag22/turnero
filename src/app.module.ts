// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PublicModule } from './public/public.module';
import { RealtimeModule } from './realtime/realtime.module';
import { HealthModule } from './health/health.module';
import { OpsModule } from './ops/ops.module';
import { TicketsModule } from './tickets/tickets.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
    AuthModule,
    UsersModule,
    PublicModule,
    RealtimeModule,
    TicketsModule,
    OpsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})


export class AppModule {}
