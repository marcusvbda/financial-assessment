import request from 'supertest';
import jwt from 'jsonwebtoken';
import db from '../../collections';
import app from '../../app';

jest.mock('../../collections', () => ({
  __esModule: true,
  default: {
    load: jest.fn(),
    get: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

type MockDb = {
  load: jest.Mock;
  get: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const mockDb = db as unknown as MockDb;

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function makeToken(role: string = 'manager', sub: number = 1) {
  return `Bearer ${jwt.sign({ sub, role, jti: `jti-${Date.now()}` }, JWT_SECRET, { expiresIn: '1h' })}`;
}

const now = '2024-01-01T00:00:00.000Z';

const mockTransaction = {
  id: 1,
  user_id: 1,
  status: 'posted' as const,
  card_id: 'tok_abc123',
  last_digits: '3456',
  holder: 'Test User',
  amount: 100,
  created_at: now,
  updated_at: now,
};

const mockTransactionPending = {
  ...mockTransaction,
  id: 2,
  status: 'pending' as const,
};

const mockTransactionReversed = {
  ...mockTransaction,
  id: 3,
  status: 'reversed' as const,
};

// 4111111111111111 is a well-known Luhn-valid test card number
const validCardPayload = {
  card_number: '4111111111111111',
  cvv: '123',
  due_date: '12/2099',
  amount: 100,
  holder: 'Test User',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.get.mockReturnValue([]); // no revoked tokens by default
});

// ─── GET /api/transactions ────────────────────────────────────────────────────

describe('GET /api/transactions', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('manager gets all transactions', async () => {
    mockDb.load.mockReturnValue([mockTransaction, mockTransactionPending]);
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', makeToken('manager'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('manager filters transactions by user_id query param', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [mockTransaction];
    });
    const res = await request(app)
      .get('/api/transactions?user_id=1')
      .set('Authorization', makeToken('manager'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user_id).toBe(1);
  });

  it('client gets only own transactions', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [{ ...mockTransaction, user_id: 2 }];
    });
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', makeToken('client', 2));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user_id).toBe(2);
  });
});

// ─── POST /api/transactions ───────────────────────────────────────────────────

describe('POST /api/transactions', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/transactions').send(validCardPayload);
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing card fields', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', makeToken('client', 2))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('returns 400 for invalid card_number (not 16 digits)', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', makeToken('client', 2))
      .send({ ...validCardPayload, card_number: '1234' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('card_number');
  });

  it('returns 400 for card_number that fails Luhn check', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', makeToken('client', 2))
      .send({ ...validCardPayload, card_number: '1234567890123456' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('card_number');
  });

  it('returns 400 for cvv with 4 digits', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', makeToken('client', 2))
      .send({ ...validCardPayload, cvv: '1234' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('cvv');
  });

  it('returns 400 for invalid due_date format (MM/YY instead of MM/YYYY)', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', makeToken('client', 2))
      .send({ ...validCardPayload, due_date: '12/25' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('due_date');
  });

  it('returns 400 for expired due_date', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', makeToken('client', 2))
      .send({ ...validCardPayload, due_date: '01/2000' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('due_date');
  });

  it('returns 400 for amount equal to zero', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', makeToken('client', 2))
      .send({ ...validCardPayload, amount: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('amount');
  });

  it('returns 400 for negative amount', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', makeToken('client', 2))
      .send({ ...validCardPayload, amount: -50 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('amount');
  });

  it('manager creates transaction using own user id from token', async () => {
    mockDb.insert.mockReturnValue({ ...mockTransaction, user_id: 1, status: 'pending' });
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', makeToken('manager', 1))
      .send(validCardPayload);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ user_id: 1, status: 'pending' });
    expect(res.body).not.toHaveProperty('card_number');
    expect(res.body).not.toHaveProperty('cvv');
    expect(res.body).not.toHaveProperty('due_date');
  });

  it('client creates transaction using own user id from token', async () => {
    mockDb.insert.mockReturnValue({ ...mockTransaction, user_id: 2, status: 'pending' });
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', makeToken('client', 2))
      .send(validCardPayload);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ user_id: 2, status: 'pending' });
    expect(res.body).not.toHaveProperty('card_number');
    expect(res.body).not.toHaveProperty('cvv');
    expect(res.body).not.toHaveProperty('due_date');
  });
});

// ─── POST /api/transactions/:id/reverse ──────────────────────────────────────

describe('POST /api/transactions/:id/reverse', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/transactions/1/reverse');
    expect(res.status).toBe(401);
  });

  it('returns 403 for client role', async () => {
    const res = await request(app)
      .post('/api/transactions/1/reverse')
      .set('Authorization', makeToken('client', 2));
    expect(res.status).toBe(403);
  });

  it('returns 404 when transaction not found', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [];
    });
    const res = await request(app)
      .post('/api/transactions/99/reverse')
      .set('Authorization', makeToken('manager'));
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Transaction not found');
  });

  it('returns 400 when transaction status is pending', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [mockTransactionPending];
    });
    const res = await request(app)
      .post('/api/transactions/2/reverse')
      .set('Authorization', makeToken('manager'));
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Only posted transactions can be reversed');
  });

  it('returns 400 when transaction status is already reversed', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [mockTransactionReversed];
    });
    const res = await request(app)
      .post('/api/transactions/3/reverse')
      .set('Authorization', makeToken('manager'));
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Only posted transactions can be reversed');
  });

  it('reverses a posted transaction and returns reversed status', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [mockTransaction];
    });
    mockDb.update.mockReturnValue({ ...mockTransaction, status: 'reversed', updated_at: new Date().toISOString() });
    const res = await request(app)
      .post('/api/transactions/1/reverse')
      .set('Authorization', makeToken('manager'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, status: 'reversed' });
    expect(res.body).toHaveProperty('updated_at');
  });
});
