import { z } from 'zod';
import 'dotenv/config';

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  API_TOKEN: z.string().min(8),
  SEED_USER_ID: z.string().uuid(),
  DASHSCOPE_API_KEY: z.string().min(8),
});

export const config = schema.parse(process.env);
