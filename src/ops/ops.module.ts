import { Module } from '@nestjs/common';
import { OpsService } from './ops.service';
import { OpsController } from './ops.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [OpsService],
  controllers: [OpsController],
})
export class OpsModule {}