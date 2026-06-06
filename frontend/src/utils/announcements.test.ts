import { describe, expect, test } from 'vitest';
import { ANNOUNCEMENTS, getAnnouncementCopy } from './announcements';

describe('announcement localization', () => {
  test('returns English announcement copy in English mode', () => {
    const copy = getAnnouncementCopy(ANNOUNCEMENTS[0], 'en');

    expect(copy.title).toBe('🎉 Quiz Buddy v0.0.10.7 Update');
    expect(copy.body).toContain('Thanks for all the feedback!');
    expect(copy.body).not.toContain('感谢各位反馈');
    expect(copy.body).not.toContain('作者大大');
  });

  test('keeps Chinese announcement copy in Chinese mode', () => {
    const copy = getAnnouncementCopy(ANNOUNCEMENTS[0], 'zh');

    expect(copy.title).toBe('🎉 刷题宝 v0.0.10.7 小更新');
    expect(copy.body).toContain('感谢各位反馈');
  });
});
