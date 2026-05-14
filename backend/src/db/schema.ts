import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, pgEnum, index } from 'drizzle-orm/pg-core';

export const profileStatus = pgEnum('profile_status', ['active', 'archived', 'given_up']);
export const questionSource = pgEnum('question_source', ['photo', 'manual', 'pdf', 'ai_gen']);
export const importJobStatus = pgEnum('import_job_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  nickname: text('nickname').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examName: text('exam_name').notNull(),
  target: text('target'),
  examDate: timestamp('exam_date', { withTimezone: true }),
  dailyMinutes: integer('daily_minutes').default(60).notNull(),
  status: profileStatus('status').default('active').notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('profiles_user_idx').on(t.userId),
}));

export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  stem: text('stem').notNull(),
  options: jsonb('options').$type<{ key: string; text: string }[]>().notNull(),
  answer: text('answer').notNull(),
  explanation: text('explanation'),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  difficulty: integer('difficulty').default(2).notNull(),
  source: questionSource('source').default('manual').notNull(),
  sourceMeta: jsonb('source_meta').$type<Record<string, unknown>>(),
  embedding: jsonb('embedding').$type<number[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  profileIdx: index('questions_profile_idx').on(t.profileId),
}));

export const importJobs = pgTable('import_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  status: importJobStatus('status').default('pending').notNull(),
  filename: text('filename').notNull(),
  totalChunks: integer('total_chunks').default(0).notNull(),
  doneChunks: integer('done_chunks').default(0).notNull(),
  candidates: jsonb('candidates').$type<unknown[]>().default([]).notNull(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
}, (t) => ({
  profileIdx: index('import_jobs_profile_idx').on(t.profileId),
  statusIdx: index('import_jobs_status_idx').on(t.status),
}));

export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chosen: text('chosen').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  timeSpentMs: integer('time_spent_ms').default(0).notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  questionIdx: index('attempts_question_idx').on(t.questionId),
  userIdx: index('attempts_user_idx').on(t.userId),
}));
