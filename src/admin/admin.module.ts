import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Module({
  controllers: [AdminController],
  providers: [AdminService, RealtimeGateway],
  exports: [AdminService],
})
export class AdminModule {}
