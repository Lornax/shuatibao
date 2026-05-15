import { and, count, eq, gte, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';

export type StudyStats = {
  totalQuestions: number;
  wrongbookCount: number;
  attemptsLast7Days: number;
  recentAttemptDates: string[]; // YYYY-MM-DD list, most recent first, up to 7 entries
  daysSinceLastAttempt: number | null;
  daysUntilExam: number | null;
};

/**
 * Snapshot the user's study state for a profile. Used by AI chat system
 * prompt so DeepSeek can produce concrete next-step advice instead of
 * generic platitudes.
 */
export async function getStudyStats(profileId: string, userId: string, examDate: Date | null): Promise<StudyStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [{ value: totalQuestions }] = await db
    .select({ value: count() })
    .from(schema.questions)
    .where(eq(schema.questions.profileId, profileId));

  // wrongbook entries that point at questions in this profile
  const [{ value: wrongbookCount }] = await db
    .select({ value: count() })
    .from(schema.wrongbookEntries)
    .innerJoin(schema.questions, eq(schema.wrongbookEntries.questionId, schema.questions.id))
    .where(
      and(
        eq(schema.wrongbookEntries.userId, userId),
        eq(schema.questions.profileId, profileId),
      ),
    );

  const [{ value: attemptsLast7Days }] = await db
    .select({ value: count() })
    .from(schema.attempts)
    .innerJoin(schema.questions, eq(schema.attempts.questionId, schema.questions.id))
    .where(
      and(
        eq(schema.attempts.userId, userId),
        eq(schema.questions.profileId, profileId),
        gte(schema.attempts.attemptedAt, sevenDaysAgo),
      ),
    );

  const dateRows = await db.execute<{ d: string }>(sql`
    SELECT DISTINCT TO_CHAR(a.attempted_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') as d
    FROM attempts a
    JOIN questions q ON q.id = a.question_id
    WHERE a.user_id = ${userId} AND q.profile_id = ${profileId}
    ORDER BY d DESC
    LIMIT 7
  `);
  const recentAttemptDates = (Array.isArray(dateRows) ? dateRows : (dateRows as any).rows ?? []).map(
    (r: { d: string }) => r.d,
  );

  let daysSinceLastAttempt: number | null = null;
  if (recentAttemptDates.length > 0) {
    const last = new Date(recentAttemptDates[0] + 'T00:00:00+08:00');
    daysSinceLastAttempt = Math.floor((Date.now() - last.getTime()) / (24 * 3600 * 1000));
  }

  let daysUntilExam: number | null = null;
  if (examDate) {
    daysUntilExam = Math.ceil((examDate.getTime() - Date.now()) / (24 * 3600 * 1000));
  }

  return {
    totalQuestions,
    wrongbookCount,
    attemptsLast7Days,
    recentAttemptDates,
    daysSinceLastAttempt,
    daysUntilExam,
  };
}
