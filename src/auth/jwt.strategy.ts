// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

type JwtPayload = {
  sub: string;      // user id
  role: 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT';
  boxNumber?: number | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    // ⚠️ usar getOrThrow para garantizar que NO sea undefined
    const secret = config.getOrThrow<string>('JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, 
    });
  }

 
  async validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      role: payload.role,
      boxNumber: payload.boxNumber ?? null,
    };
  }
}
