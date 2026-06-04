import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('Missing token authorization header.');

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, 'SUPER_SECRET_KEY_123') as { id: string; role: string };
      
      if (decoded.role !== 'ADMIN') {
        throw new ForbiddenException('Access denied. Admin role required.');
      }
      
      request.user = decoded;
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Invalid token session.');
    }
  }
}