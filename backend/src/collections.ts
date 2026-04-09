import fs from 'fs';
import path from 'path';

type Entity = { id: number };
type FilterCallback<T> = (item: T) => boolean;

const DATA_DIR = path.join(__dirname, '/data');

function filePath(index: string): string {
  return path.join(DATA_DIR, `${index}.json`);
}

function readCollection<T>(index: string): T[] {
  const file = filePath(index);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T[];
}

function writeCollection<T>(index: string, data: T[]): void {
  fs.writeFileSync(filePath(index), JSON.stringify(data, null, 2), 'utf-8');
}

const dataPersistence = {
  load<T>(index: string): T[] {
    return readCollection<T>(index);
  },

  get<T>(index: string, callbackFilter: FilterCallback<T> | null = null): T[] {
    const data = readCollection<T>(index);
    return callbackFilter ? data.filter(callbackFilter) : data;
  },

  delete<T>(index: string, callbackFilter: FilterCallback<T> | null = null): void {
    if (!callbackFilter) {
      writeCollection(index, []);
      return;
    }
    const data = readCollection<T>(index);
    writeCollection(
      index,
      data.filter((item) => !callbackFilter(item))
    );
  },

  update<T extends Entity>(index: string, id: number, updates: Partial<Omit<T, 'id'>>): T | null {
    const data = readCollection<T>(index);
    const i = data.findIndex((item) => item.id === id);
    if (i === -1) return null;
    data[i] = { ...data[i], ...updates };
    writeCollection(index, data);
    return data[i];
  },

  insert<T extends Entity>(index: string, item: Omit<T, 'id'>): T {
    const data = readCollection<T>(index);
    const nextId = data.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
    const newItem = { ...item, id: nextId } as T;
    data.push(newItem);
    writeCollection(index, data);
    return newItem;
  },
};

export default dataPersistence;
