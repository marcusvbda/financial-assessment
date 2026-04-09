import { Router, Request, Response } from 'express';
import userService from './user.service';
import { createUserSchema, updateUserSchema, CreateUserInput, UpdateUserInput } from './user.schema';
import { validate } from '../../middlewares/validate';
import { AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 *
 * /api/users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users (password omitted)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (manager role required)
 */
router.get('/', requireRole('manager'), (_req: Request, res: Response) => {
  res.json(userService.listAll());
});

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get logged-in user data
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged-in user (password omitted)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (manager role required)
 *       404:
 *         description: User not found
 */
router.get('/me', (req: AuthRequest, res: Response) => {
  const user = userService.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by id
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (manager role required)
 *       404:
 *         description: User not found
 */
router.get('/:id', requireRole('manager'), (req: Request, res: Response) => {
  const user = userService.findById(parseInt(req.params.id, 10));
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [manager, client]
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (manager role required)
 */
router.post('/', requireRole('manager'), validate(createUserSchema), async (req: Request, res: Response) => {
  const user = await userService.create(req.body as CreateUserInput);
  res.status(201).json(user);
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [manager, client]
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (manager role required)
 *       404:
 *         description: User not found
 */
router.put('/:id', requireRole('manager'), validate(updateUserSchema), async (req: Request, res: Response) => {
  const updated = await userService.update(parseInt(req.params.id, 10), req.body as UpdateUserInput);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(updated);
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: User deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (manager role required)
 *       404:
 *         description: User not found
 */
router.delete('/:id', requireRole('manager'), (req: Request, res: Response) => {
  const removed = userService.remove(parseInt(req.params.id, 10));
  if (!removed) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.status(204).send();
});

export default router;
