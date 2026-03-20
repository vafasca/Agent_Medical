import fs from 'fs';
import path from 'path';

export const DATA_DIR =
  process.env.APP_DATA_DIR ||
  path.join(/* turbopackIgnore: true */ process.cwd(), 'data');

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDataFile(fileName: string) {
  ensureDataDir();
  return path.join(DATA_DIR, fileName);
}

export function readJsonFile<T>(fileName: string, defaultValue: T): T {
  const filePath = getDataFile(fileName);

  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return defaultValue;
  }
}

export function writeJsonFile<T>(fileName: string, data: T) {
  const filePath = getDataFile(fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
