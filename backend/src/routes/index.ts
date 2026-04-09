import { Router } from 'express';
import usersRouter from '../domain/users/user.routes';
import authRouter from '../domain/auth/auth.routes';
import { isAuthenticated } from '../middlewares/auth';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', isAuthenticated, usersRouter);

export default router;
