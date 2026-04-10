import { randomUUID } from 'crypto';
import transactionModel, { Transaction } from './transaction.model';
import { getIO } from '../../socket';

const POSTBACK_EMULATE_TIMEOUT = 8000;
type TransactionStatus = Transaction['status'];

interface CardInput {
  cardNumber: string;
  holder: string;
  amount: number;
}

function tokenizeCard(cardNumber: string): { card_id: string; last_digits: string } {
  // Emulates payment gateway card tokenization — never persists raw card data
  return {
    card_id: `tok_${randomUUID().replace(/-/g, '')}`,
    last_digits: cardNumber.slice(-4),
  };
}

function checkTransactionStatus(transactionId: number): void {
  // Emulates payment gateway postback to update transaction status
  setTimeout(() => {
    const updated = transactionModel.update(transactionId, { status: 'posted' });
    if (!updated) return;

    const io = getIO();
    if (io) {
      io.emit(`transaction-update-${transactionId}`, { status: updated.status });
    }
  }, POSTBACK_EMULATE_TIMEOUT);
}

const transactionService = {
  listAll(filters: { status?: TransactionStatus; userId?: number } = {}): Transaction[] {
    const { status, userId } = filters;

    if (status !== undefined || userId !== undefined) {
      return transactionModel.findFiltered({ status, userId });
    }

    return transactionModel.findAll();
  },

  listForUser(userId: number, status?: TransactionStatus): Transaction[] {
    if (status !== undefined) {
      return transactionModel.findFiltered({ status, userId });
    }

    return transactionModel.findByUserId(userId);
  },

  getById(id: number, requester: { id: number; role: string }): Transaction | 'not_found' {
    const transaction = transactionModel.findById(id);

    if (!transaction) {
      return 'not_found';
    }

    if (requester.role !== 'manager' && transaction.user_id !== requester.id) {
      return 'not_found';
    }

    return transaction;
  },

  create(userId: number, card: CardInput): Transaction {
    const { card_id, last_digits } = tokenizeCard(card.cardNumber);
    const transaction = transactionModel.create({
      user_id: userId,
      status: 'pending',
      card_id,
      last_digits,
      holder: card.holder,
      amount: card.amount,
    });
    checkTransactionStatus(transaction.id);
    return transaction;
  },

  reverse(id: number): Transaction | 'not_found' | 'not_posted' {
    const transaction = transactionModel.findById(id);
    if (!transaction) return 'not_found';
    if (transaction.status !== 'posted') return 'not_posted';
    return transactionModel.update(id, { status: 'reversed' })!;
  },
};

export default transactionService;
