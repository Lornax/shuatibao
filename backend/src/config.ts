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
  // Fallback: coding plan (qwen3.6-plus / glm-5 / qwen3-max-2026-01-23)
  // 文本/视觉 LLM 用完时切. 向量模型这个套餐没有, embed 走 v3→v2 fallback.
  DASHSCOPE_CODING_API_KEY: z.string().optional(),
  DASHSCOPE_CODING_BASE_URL: z.string().default('https://coding.dashscope.aliyuncs.com/v1'),
  // 硅基流动: 给 embedding 用. BAAI/bge-m3 永久免费, 1024 维兼容 dashscope text-embedding-v3/v4.
  // RPM 2000 / TPM 500K, 对本项目用量完全够 (单本教材最多 100 个 batch).
  SILICONFLOW_API_KEY: z.string().optional(),
  SILICONFLOW_BASE_URL: z.string().default('https://api.siliconflow.cn/v1'),
  // 小米 MiMo: 给 chat / text / vision 用 (mimo-v2.5-pro / mimo-v2.5). OpenAI 完全兼容.
  // 没配时降级走 dashscope (现有 qwen-max / vl-max / deepseek-v3).
  MIMO_API_KEY: z.string().optional(),
  MIMO_BASE_URL: z.string().default('https://api.xiaomimimo.com/v1'),
});

const raw = schema.parse(process.env);

export const config = raw;
