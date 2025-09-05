import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const incoming = req.headers['x-request-id'] as string | undefined;
    const id = incoming && typeof incoming === 'string' && incoming.trim() !== '' ? incoming : uuidv4();

    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}