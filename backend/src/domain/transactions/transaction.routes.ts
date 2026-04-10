import { Router, Response } from 'express';
import transactionService from './transaction.service';
import { createTransactionSchema, CreateTransactionInput } from './transaction.schema';
import { AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Transaction management
 *
 * /api/transactions:
 *   get:
 *     summary: List transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by user (manager only)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, posted, reversed]
 *         description: Filter by transaction status
 *     responses:
 *       200:
 *         description: List of transactions
 *       401:
 *         description: Unauthorized
 */
router.get('/', (req: AuthRequest, res: Response) => {
  const status = req.query.status as 'pending' | 'posted' | 'reversed' | undefined;

  if (req.user!.role === 'manager') {
    const userId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined;
    res.json(transactionService.listAll({ status, userId }));
  } else {
    res.json(transactionService.listForUser(req.user!.id, status));
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get a single transaction
 *     tags: [Transactions]
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
 *         description: Transaction details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 */
router.get('/:id', (req: AuthRequest, res: Response) => {
  const result = transactionService.getById(parseInt(req.params.id, 10), req.user!);

  if (result === 'not_found') {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  res.json(result);
});

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [card_number, cvv, due_date, amount, holder]
 *             properties:
 *               card_number:
 *                 type: string
 *                 description: 16-digit card number (not stored)
 *               cvv:
 *                 type: string
 *                 description: 3-digit CVV (not stored)
 *               due_date:
 *                 type: string
 *                 description: MM/YYYY expiry date (not stored)
 *               amount:
 *                 type: number
 *               holder:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction created with status pending
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', (req: AuthRequest, res: Response) => {
  const result = createTransactionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten().fieldErrors });
    return;
  }
  const { card_number, holder, amount } = result.data as CreateTransactionInput;
  const transaction = transactionService.create(req.user!.id, { cardNumber: card_number, holder, amount });
  res.status(201).json(transaction);
});

/**
 * @swagger
 * /api/transactions/{id}/reverse:
 *   post:
 *     summary: Reverse a transaction
 *     tags: [Transactions]
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
 *         description: Transaction reversed
 *       400:
 *         description: Transaction is not in posted status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (manager role required)
 *       404:
 *         description: Transaction not found
 */
router.post('/:id/reverse', requireRole('manager'), (req: AuthRequest, res: Response) => {
  const result = transactionService.reverse(parseInt(req.params.id, 10));
  if (result === 'not_found') {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  if (result === 'not_posted') {
    res.status(400).json({ error: 'Only posted transactions can be reversed' });
    return;
  }
  res.json(result);
});

export default router;
