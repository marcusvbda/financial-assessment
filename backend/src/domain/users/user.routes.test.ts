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

const JWT_SECRET = process.env.JWT_SECRET!;

function makeToken(role: string = 'manager') {
  return `Bearer ${jwt.sign({ sub: 1, role, jti: `jti-${Date.now()}` }, JWT_SECRET, { expiresIn: '1h' })}`;
}

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  password: '$2b$10$hashedpassword',
  role: 'manager' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.get.mockReturnValue([]); // no revoked tokens by default
});

// ─── Auth guards ─────────────────────────────────────────────────────────────

describe('Auth / Role guards', () => {
  const managerRoutes: Array<[string, string, object?]> = [
    ['GET', '/api/users'],
    ['GET', '/api/users/1'],
    ['POST', '/api/users'],
    ['PUT', '/api/users/1'],
    ['DELETE', '/api/users/1'],
  ];

  describe.each(managerRoutes)('%s %s requires manager role', (method, path) => {
    it('returns 401 without token', async () => {
      const res = await (request(app) as any)[method.toLowerCase()](path);
      expect(res.status).toBe(401);
    });

    it('returns 403 for client role', async () => {
      mockDb.load.mockReturnValue([]);
      mockDb.get.mockReturnValue([]);
      const res = await (request(app) as any)
        [method.toLowerCase()](path)
        .set('Authorization', makeToken('client'));
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users/me allows any authenticated role', () => {
    beforeEach(() => {
      mockDb.get.mockImplementation((index: string) => {
        if (index === 'revoked-tokens') return [];
        return [mockUser];
      });
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('returns 200 for manager role', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', makeToken('manager'));
      expect(res.status).toBe(200);
    });

    it('returns 200 for client role', async () => {
      const res = await request(app).get('/api/users/me').set('Authorization', makeToken('client'));
      expect(res.status).toBe(200);
    });
  });
});

// ─── GET /api/users ──────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  it('returns empty list', async () => {
    mockDb.load.mockReturnValue([]);
    const res = await request(app).get('/api/users').set('Authorization', makeToken());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns users without password field', async () => {
    mockDb.load.mockReturnValue([mockUser]);
    const res = await request(app).get('/api/users').set('Authorization', makeToken());
    expect(res.status).toBe(200);
    expect(res.body[0]).not.toHaveProperty('password');
    expect(res.body[0]).toMatchObject({ id: 1, name: 'Test User', email: 'test@example.com' });
  });
});

// ─── GET /api/users/me ───────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('returns 404 when logged user is not found in db', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [];
    });
    const res = await request(app).get('/api/users/me').set('Authorization', makeToken());
    expect(res.status).toBe(404);
  });

  it('returns logged user data without password', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [mockUser];
    });
    const res = await request(app).get('/api/users/me').set('Authorization', makeToken());
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('password');
    expect(res.body.id).toBe(mockUser.id);
    expect(res.body.email).toBe(mockUser.email);
  });
});

// ─── GET /api/users/:id ──────────────────────────────────────────────────────

describe('GET /api/users/:id', () => {
  it('returns 404 when user not found', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [];
    });
    const res = await request(app).get('/api/users/99').set('Authorization', makeToken());
    expect(res.status).toBe(404);
  });

  it('returns user without password', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [mockUser];
    });
    const res = await request(app).get('/api/users/1').set('Authorization', makeToken());
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('password');
    expect(res.body.id).toBe(1);
  });
});

// ─── POST /api/users ─────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', makeToken())
      .send({ name: 'Only Name' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', makeToken())
      .send({ name: 'Test', email: 'invalid', password: '123456', role: 'client' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for password shorter than 6 chars', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', makeToken())
      .send({ name: 'Test', email: 'test@test.com', password: '123', role: 'client' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', makeToken())
      .send({ name: 'Test', email: 'test@test.com', password: '123456', role: 'admin' });
    expect(res.status).toBe(400);
  });

  it('creates user and returns 201 without password', async () => {
    mockDb.insert.mockReturnValue({ ...mockUser, id: 2 });
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', makeToken())
      .send({ name: 'New', email: 'new@example.com', password: 'password123', role: 'client' });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('password');
    expect(res.body.id).toBe(2);
  });
});

// ─── PUT /api/users/:id ──────────────────────────────────────────────────────

describe('PUT /api/users/:id', () => {
  it('returns 400 for empty body', async () => {
    const res = await request(app).put('/api/users/1').set('Authorization', makeToken()).send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when user not found', async () => {
    mockDb.update.mockReturnValue(null);
    const res = await request(app)
      .put('/api/users/99')
      .set('Authorization', makeToken())
      .send({ name: 'Updated' });
    expect(res.status).toBe(404);
  });

  it('updates user and returns without password', async () => {
    mockDb.update.mockReturnValue({ ...mockUser, name: 'Updated' });
    const res = await request(app)
      .put('/api/users/1')
      .set('Authorization', makeToken())
      .send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
    expect(res.body).not.toHaveProperty('password');
  });
});

// ─── DELETE /api/users/:id ───────────────────────────────────────────────────

describe('DELETE /api/users/:id', () => {
  it('returns 404 when user not found', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [];
    });
    const res = await request(app).delete('/api/users/99').set('Authorization', makeToken());
    expect(res.status).toBe(404);
  });

  it('deletes user and returns 204', async () => {
    mockDb.get.mockImplementation((index: string) => {
      if (index === 'revoked-tokens') return [];
      return [mockUser];
    });
    const res = await request(app).delete('/api/users/1').set('Authorization', makeToken());
    expect(res.status).toBe(204);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
