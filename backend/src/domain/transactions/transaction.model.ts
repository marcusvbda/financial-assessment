import db from '../../collections';

export type TransactionStatus = 'posted' | 'pending' | 'reversed';

export interface Transaction {
  id: number;
  user_id: number;
  status: TransactionStatus;
  card_id: string;
  last_digits: string;
  holder: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

const INDEX = 'transactions';

const transactionModel = {
  findAll: (): Transaction[] => db.load<Transaction>(INDEX),

  findFiltered: ({
    status,
    userId,
  }: {
    status?: TransactionStatus;
    userId?: number;
  }): Transaction[] =>
    db.get<Transaction>(INDEX, (transaction) => {
      if (userId !== undefined && transaction.user_id !== userId) {
        return false;
      }

      if (status !== undefined && transaction.status !== status) {
        return false;
      }

      return true;
    }),

  findByUserId: (userId: number): Transaction[] =>
    db.get<Transaction>(INDEX, (t) => t.user_id === userId),

  findById: (id: number): Transaction | null =>
    db.get<Transaction>(INDEX, (t) => t.id === id)[0] ?? null,

  create: (data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Transaction =>
    db.insert<Transaction>(INDEX, data as Omit<Transaction, 'id'>),

  update: (id: number, data: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>): Transaction | null =>
    db.update<Transaction>(INDEX, id, data),
};

export default transactionModel;
