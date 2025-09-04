
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateUserDto {
  @IsEmail() email: string;
  @IsString() name: string;
  @IsString() password: string;
  @IsIn(['ADMIN','BOX_AGENT','PSYCHO_AGENT']) role: 'ADMIN'|'BOX_AGENT'|'PSYCHO_AGENT';
  @IsOptional() @IsString() office?: string;
  @IsOptional() @IsInt() boxNumber?: number;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}
  @Post()
  create(@Req() req, @Body() dto: CreateUserDto) {
    return this.users.create(req.user, dto as any);
  }
}

