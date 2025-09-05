import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() name!: string;
  @IsString() @MinLength(6) password!: string;
  @IsIn(['ADMIN','BOX_AGENT','PSYCHO_AGENT']) role!: 'ADMIN'|'BOX_AGENT'|'PSYCHO_AGENT';
  @IsOptional() @IsString() office?: string;
  @IsOptional() @IsInt() boxNumber?: number;
}

class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(['ADMIN','BOX_AGENT','PSYCHO_AGENT']) role?: 'ADMIN'|'BOX_AGENT'|'PSYCHO_AGENT';
  @IsOptional() @IsString() office?: string | null;
  @IsOptional() @IsInt() boxNumber?: number | null;
}

class ResetPasswordDto {
  @IsString() @MinLength(6) newPassword!: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard, AdminGuard) // todos requieren ADMIN
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  list(@Req() req) {
    return this.users.list(req.user);
  }

  @Post()
  create(@Req() req, @Body() dto: CreateUserDto) {
    return this.users.create(req.user, dto as any);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(req.user, id, dto as any);
  }

  @Post(':id/reset-password')
  resetPassword(@Req() req, @Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.users.resetPassword(req.user, id, dto.newPassword);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.users.remove(req.user, id);
  }
}
