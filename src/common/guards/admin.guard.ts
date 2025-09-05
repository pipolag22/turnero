import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";



@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Solo ADMIN');
    }
    return true;
  }
}