import { z } from 'zod';
import 'dotenv/config';

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  API_TOKEN: z.string().min(8),
  SEED_USER_ID: z.string().uuid(),
  DASHSCOPE_API_KEY: z.string().min(8),
  // JWT secret 用于多用户登录态. 至少 32 字符随机串.
  JWT_SECRET: z.string().min(16),
  // optional production HTTP basic auth — wraps SPA & static files
  // to keep IP scanners from loading the JS bundle that contains the
  // hardcoded API token. /api/* + /health bypass this layer.
  BASIC_AUTH_USER: z.string().optional(),
  BASIC_AUTH_PASS: z.string().optional(),
  // Optional Tencent Cloud COS for PDF original-file upload. All 4 must be
  // set for COS to activate; otherwise import-jobs skip COS upload silently.
  COS_SECRET_ID: z.string().optional(),
  COS_SECRET_KEY: z.string().optional(),
  COS_BUCKET: z.string().optional(),
  COS_REGION: z.string().optional(),
});

export const config = schema.parse(process.env);
