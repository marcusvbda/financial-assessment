import db from '../../collections';

export type Role = 'manager' | 'client';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: Role;
}

export type SafeUser = Omit<User, 'password'>;

const INDEX = 'users';

const userModel = {
  findAll: (): User[] => db.load<User>(INDEX),

  findById: (id: number): User | null => db.get<User>(INDEX, (u) => u.id === id)[0] ?? null,

  create: (data: Omit<User, 'id'>): User => db.insert<User>(INDEX, data),

  update: (id: number, data: Partial<Omit<User, 'id'>>): User | null =>
    db.update<User>(INDEX, id, data),

  remove: (id: number): void => db.delete<User>(INDEX, (u) => u.id === id),
};

export default userModel;
