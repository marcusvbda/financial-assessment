import { Request, Response, NextFunction } from 'express';
import authService from '../domain/auth/auth.service';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    jti: string;
  };
}

export function isAuthenticated(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const payload = authService.verify(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  if (authService.isRevoked(payload.jti)) {
    res.status(401).json({ error: 'Token revoked' });
    return;
  }

  req.user = { id: payload.sub, role: payload.role, jti: payload.jti };
  next();
}
