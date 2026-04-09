import bcrypt from 'bcrypt';
import userModel, { User, SafeUser } from './user.model';

const SALT_ROUNDS = 10;

function sanitize(user: User): SafeUser {
  const { password: _pw, ...safe } = user;
  return safe;
}

const userService = {
  listAll(): SafeUser[] {
    return userModel.findAll().map(sanitize);
  },

  findById(id: number): SafeUser | null {
    const user = userModel.findById(id);
    return user ? sanitize(user) : null;
  },

  async create(data: Omit<User, 'id'>): Promise<SafeUser> {
    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = userModel.create({ ...data, password: hashed });
    return sanitize(user);
  },

  async update(id: number, data: Partial<Omit<User, 'id'>>): Promise<SafeUser | null> {
    const updates = { ...data };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }
    const updated = userModel.update(id, updates);
    return updated ? sanitize(updated) : null;
  },

  remove(id: number): boolean {
    const existing = userModel.findById(id);
    if (!existing) return false;
    userModel.remove(id);
    return true;
  },
};

export default userService;
