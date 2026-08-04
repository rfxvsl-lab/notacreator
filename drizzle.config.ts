import { config } from 'dotenv';
config({ path: '.env.local' });
import { defineConfig } from 'drizzle-kit';
import { join } from 'path';

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

const localSqlitePath = join(process.cwd(), '.data', 'quicknota.db');

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: tursoUrl ? 'turso' : 'sqlite',
  dbCredentials: tursoUrl
    ? {
        url: tursoUrl,
        authToken: tursoToken,
      }
    : {
        url: `file:${localSqlitePath}`,
      },
});
