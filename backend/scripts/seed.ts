import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema.js';

async function seed() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  const existing = await db.select().from(schema.users).limit(1);
  if (existing.length > 0) {
    console.log('seed: user exists, skipping. id =', existing[0].id);
    await client.end();
    process.exit(0);
  }
  const [user] = await db
    .insert(schema.users)
    .values({
      email: 'lornax@local',
      nickname: 'Lornax',
    })
    .returning();
  console.log('seed: created user', user.id);
  console.log('PUT THIS IN backend/.env -> SEED_USER_ID=' + user.id);
  await client.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
