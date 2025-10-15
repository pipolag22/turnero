import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  controllers: [AdminController],
  providers: [AdminService, RealtimeGateway],
  exports: [AdminService],
  imports: [ScheduleModule.forRoot(),],
})
export class AdminModule {}
