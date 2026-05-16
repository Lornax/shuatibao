import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { hashPassword, signUserJwt, verifyPassword, verifyUserJwt } from '../lib/auth.js';

const router = new Hono();

// /me 需要 auth, 但 authRouter mount 在全局 auth middleware 之前
// (这样 /register /login 才能公开). 单独给 /me 加一个迷你 auth.
async function requireAuth(c: any, next: any) {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  const payload = await verifyUserJwt(token);
  if (!payload?.sub) return c.json({ error: 'unauthorized' }, 401);
  c.set('userId', payload.sub);
  await next();
}

const registerSchema = z.object({
  email: z.string().email().max(200),
  nickname: z.string().min(1).max(50),
  password: z.string().min(6).max(100),
});

router.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const email = parsed.data.email.toLowerCase().trim();
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing) return c.json({ error: 'email_taken' }, 409);

  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      nickname: parsed.data.nickname.trim(),
      passwordHash,
    })
    .returning({ id: schema.users.id, email: schema.users.email, nickname: schema.users.nickname });

  const token = await signUserJwt(user.id, user.email);
  return c.json({ token, user }, 201);
});

const loginSchema = z.object({
  // 登录宽松接受任何邮箱字符串（包括内部地址如 user@local）
  email: z.string().min(3).max(200),
  password: z.string().min(1).max(100),
});

router.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const email = parsed.data.email.toLowerCase().trim();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  // 不区分"邮箱不存在"和"密码错"，避免账号枚举
  if (!user) return c.json({ error: 'invalid_credentials' }, 401);
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return c.json({ error: 'invalid_credentials' }, 401);

  const token = await signUserJwt(user.id, user.email);
  return c.json({
    token,
    user: { id: user.id, email: user.email, nickname: user.nickname },
  });
});

router.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string | undefined;
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      nickname: schema.users.nickname,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user) return c.json({ error: 'not_found' }, 404);
  return c.json({ user });
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword: z.string().min(6).max(100),
});

router.patch('/password', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string | undefined;
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const body = await c.req.json().catch(() => null);
  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user) return c.json({ error: 'not_found' }, 404);

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return c.json({ error: 'invalid_current_password' }, 400);

  const newHash = await hashPassword(parsed.data.newPassword);
  await db.update(schema.users).set({ passwordHash: newHash }).where(eq(schema.users.id, userId));
  return c.json({ ok: true });
});

export { router as authRouter };
