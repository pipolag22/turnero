import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async validate(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');
    return user;
  }

  async login(email: string, password: string) {
    const u = await this.validate(email, password);
    const payload = { sub: u.id, role: u.role, boxNumber: u.boxNumber };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: '8h' });
    return { accessToken, user: u };
  }
}
