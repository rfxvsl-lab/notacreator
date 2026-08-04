import { mkdirSync } from 'fs';
import { join } from 'path';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const localDbPath = join(process.cwd(), '.data', 'quicknota.db');

if (!process.env.TURSO_DATABASE_URL) {
  mkdirSync(join(process.cwd(), '.data'), { recursive: true });
}

const databaseUrl = process.env.TURSO_DATABASE_URL || `file:${localDbPath}`;
const client = createClient({
  url: databaseUrl,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

export const db = drizzle(client, { schema });
