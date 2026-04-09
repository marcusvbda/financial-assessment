import request from 'supertest';
import bcrypt from 'bcrypt';
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

const hashedPassword = bcrypt.hashSync('password123', 1);

const mockUser = {
  id: 1,
  name: 'Manager',
  email: 'manager@example.com',
  password: hashedPassword,
  role: 'manager' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.get.mockReturnValue([]);
});

describe('POST /api/auth/login', () => {
  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when user not found', async () => {
    mockDb.load.mockReturnValue([]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns 401 for wrong password', async () => {
    mockDb.load.mockReturnValue([mockUser]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: mockUser.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns token on valid credentials', async () => {
    mockDb.load.mockReturnValue([mockUser]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: mockUser.email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });
});

describe('POST /api/auth/revoke', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/auth/revoke');
    expect(res.status).toBe(401);
  });

  it('revokes valid token and returns 204', async () => {
    mockDb.load.mockReturnValue([mockUser]);
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: mockUser.email, password: 'password123' });

    mockDb.insert.mockReturnValue({ id: 1, jti: 'any' });

    const res = await request(app)
      .post('/api/auth/revoke')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(res.status).toBe(204);
    expect(mockDb.insert).toHaveBeenCalledWith(
      'revoked-tokens',
      expect.objectContaining({ jti: expect.any(String) })
    );
  });
});
