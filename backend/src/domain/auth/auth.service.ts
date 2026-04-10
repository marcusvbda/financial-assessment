import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import userModel from '../users/user.model';
import db from '../../collections';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '12h';
const REVOKED_INDEX = 'revoked-tokens';

interface RevokedToken {
  id: number;
  jti: string;
}

export interface JwtPayload {
  sub: number;
  role: string;
  jti: string;
}

const authService = {
  async login(email: string, password: string): Promise<string | null> {
    const user = userModel
      .findAll()
      .find((u) => String(u.email).toLocaleLowerCase() === String(email).toLocaleLowerCase());
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    const jti = crypto.randomUUID();
    return jwt.sign({ sub: user.id, role: user.role, jti }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  },

  revoke(jti: string): void {
    db.insert<RevokedToken>(REVOKED_INDEX, { jti });
  },

  isRevoked(jti: string): boolean {
    return db.get<RevokedToken>(REVOKED_INDEX, (t) => t.jti === jti).length > 0;
  },

  verify(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
    } catch {
      return null;
    }
  },
};

export default authService;
