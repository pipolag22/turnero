import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { TicketsModule } from '../tickets/tickets.module'; 
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [TicketsModule,AdminModule], 
  controllers: [PublicController],
})
export class PublicModule {}