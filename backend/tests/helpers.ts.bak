import { db, schema } from '../src/db/client.js';
import { config } from '../src/config.js';
import { sql } from 'drizzle-orm';
import { beforeEach } from 'vitest';

export const TEST_TOKEN = config.API_TOKEN;
export const TEST_USER_ID = config.SEED_USER_ID;

export async function resetDb() {
  await db.execute(sql`TRUNCATE attempts, questions, profiles, users RESTART IDENTITY CASCADE`);
  await db.insert(schema.users).values({
    id: TEST_USER_ID,
    email: 'lornax@local',
    nickname: 'Lornax',
  });
}

beforeEach(async () => {
  await resetDb();
});

export function authHeaders() {
  return { Authorization: `Bearer ${TEST_TOKEN}` };
}
