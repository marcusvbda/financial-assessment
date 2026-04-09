import { Router, Request, Response } from 'express';
import authService from './auth.service';
import { loginSchema, LoginInput } from './auth.schema';
import { validate } from '../../middlewares/validate';
import { isAuthenticated, AuthRequest } from '../../middlewares/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication
 *
 * /api/auth/login:
 *   post:
 *     summary: Login and receive JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(loginSchema), async (_req: Request, res: Response) => {
  const { email, password } = _req.body as LoginInput;
  const token = await authService.login(email, password);
  if (!token) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  res.json({ token });
});

/**
 * @swagger
 * /api/auth/revoke:
 *   post:
 *     summary: Revoke current JWT token (logout)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Token revoked
 *       401:
 *         description: Unauthorized
 */
router.post('/revoke', isAuthenticated, (req: AuthRequest, res: Response) => {
  authService.revoke(req.user!.jti);
  res.status(204).send();
});

export default router;
