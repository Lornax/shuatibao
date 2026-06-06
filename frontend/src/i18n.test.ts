import { describe, expect, test } from 'vitest';
import {
  formatDatePickerDisplay,
  formatDatePickerMonth,
  formatDatePickerTodayAction,
  formatProfileMeta,
  getDatePickerWeekLabels,
  getStoredLanguage,
  resolveTranslatedValue,
  translateStaticText,
  type Language,
} from './i18n';

function storageWith(value: string | null): Storage {
  const data = new Map<string, string>();
  if (value !== null) data.set('lod_language', value);
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, item: string) => {
      data.set(key, item);
    },
  };
}

describe('i18n language helpers', () => {
  test('defaults to Chinese when no valid saved language exists', () => {
    expect(getStoredLanguage(storageWith(null))).toBe<Language>('zh');
    expect(getStoredLanguage(storageWith('fr'))).toBe<Language>('zh');
  });

  test('reads saved English language preference', () => {
    expect(getStoredLanguage(storageWith('en'))).toBe<Language>('en');
  });

  test('keeps Chinese text unchanged in Chinese mode', () => {
    expect(translateStaticText('我的备考', 'zh')).toBe('我的备考');
  });

  test('translates fixed UI copy in English mode', () => {
    expect(translateStaticText('我的备考', 'en')).toBe('My Exams');
    expect(translateStaticText('🔔 作者公告', 'en')).toBe('🔔 Announcements');
    expect(translateStaticText('加载中...', 'en')).toBe('Loading...');
    expect(translateStaticText('+ 新档案', 'en')).toBe('+ New Exam');
    expect(translateStaticText('+ 新建第一个档案', 'en')).toBe('+ Create First Exam');
    expect(translateStaticText('新建档案', 'en')).toBe('New Exam');
    expect(translateStaticText('编辑档案', 'en')).toBe('Edit Exam');
    expect(translateStaticText('每日目标', 'en')).toBe('Daily Goal');
    expect(translateStaticText('小时 / 天', 'en')).toBe('hours / day');
  });

  test('translates feedback modal textarea and screenshot copy', () => {
    expect(
      translateStaticText('例：拍照识题后保存按钮点不动；想要导出所有错题到 PDF…', 'en'),
    ).toBe('Example: the photo-recognition save button does not respond; I want to export all wrong questions to PDF...');
    expect(translateStaticText('附截图（可选，最多', 'en')).toBe('Attach screenshots (optional, up to');
    expect(translateStaticText('张）', 'en')).toBe(' screenshots)');
    expect(translateStaticText('添加截图', 'en')).toBe('Add screenshot');
    expect(translateStaticText('截图 2', 'en')).toBe('Screenshot 2');
  });

  test('translates common dynamic UI copy in English mode', () => {
    expect(translateStaticText('已归档 (3)', 'en')).toBe('Archived (3)');
    expect(translateStaticText('共 18 道 · 进入题库管理查看全部 →', 'en')).toBe(
      '18 total · View all in Library →',
    );
  });

  test('translates main exam workflow UI copy found by browser scan', () => {
    expect(translateStaticText('+ 加题', 'en')).toBe('+ Add Question');
    expect(translateStaticText('未设考试日期', 'en')).toBe('No exam date set');
    expect(translateStaticText('⏱ 今日时长', 'en')).toBe("⏱ Today's time");
    expect(translateStaticText('0 / 60 分钟', 'en')).toBe('0 / 60 min');
    expect(translateStaticText('今天 5月31日周日 ·', 'en')).toBe('Today May 31 Sun ·');
    expect(translateStaticText('Today 5月31日周日 ·', 'en')).toBe('Today May 31 Sun ·');
    expect(translateStaticText('5月31日周日 ·', 'en')).toBe('May 31 Sun ·');
    expect(translateStaticText('考试日期未设 · 题库 1 道，跟 AI 教练定个今日计划 →', 'en')).toBe(
      "No exam date set · 1 question in library. Ask the AI coach for today's plan →",
    );
    expect(
      translateStaticText('今天 5月31日周日 · 考试日期未设 · 题库 1 道，跟 AI 教练定个今日计划 →', 'en'),
    ).toBe("Today · No exam date set · 1 question in library. Ask the AI coach for today's plan →");

    expect(translateStaticText('拍一张或从相册选一张题目图，下一步可以裁剪出单道题。', 'en')).toBe(
      'Take or choose a question image. You can crop one question in the next step.',
    );
    expect(translateStaticText('⬆️ 上传新 PDF', 'en')).toBe('⬆️ Upload New PDF');
    expect(translateStaticText('点这里选 PDF', 'en')).toBe('Choose PDF');
    expect(translateStaticText('AI 出题', 'en')).toBe('AI Generate');
    expect(translateStaticText('出题模式', 'en')).toBe('Generation Mode');
    expect(translateStaticText('📖 指定章节', 'en')).toBe('📖 By chapter');
    expect(translateStaticText('教材章节（选填）', 'en')).toBe('Textbook Chapter (optional)');
    expect(translateStaticText('1 道（单题确认）', 'en')).toBe('1 question (confirm first)');
    expect(translateStaticText('🎲 AI 帮我出 一道', 'en')).toBe('🎲 Generate 1 question');

    expect(
      translateStaticText('：AI 答题、解析、出题都靠通用知识回答，章节 / 页码可能不准，甚至会编造。', 'en'),
    ).toBe(': AI answers, explanations, and generated questions rely on general knowledge, so chapters/pages may be inaccurate.');
    expect(translateStaticText('[第 X 章·第 Y 页]', 'en')).toBe('[Chapter X · Page Y]');
    expect(translateStaticText('上传 PDF（≤50MB），几百页的教材需要几分钟解析 + 嵌入。', 'en')).toBe(
      'Upload a PDF (≤50MB). Large textbooks can take a few minutes to parse and embed.',
    );
    expect(translateStaticText('错题本里的题会一直保留，直到你连续答对', 'en')).toBe(
      'Wrong-book questions stay here until you answer correctly',
    );
    expect(translateStaticText('次。蒙对的、印象深的题也可以在答题页主动加入。', 'en')).toBe(
      'times in a row. You can also add memorable questions from the quiz page.',
    );
    expect(
      translateStaticText('错题本里的题会一直保留，直到你连续答对 3 次。蒙对的、印象深的题也可以在答题页主动加入。', 'en'),
    ).toBe('Wrong-book questions stay here until you answer correctly 3 times in a row. You can also add memorable questions from the quiz page.');
    expect(
      translateStaticText('AI 知道你的题库情况、错题数和距考时间，会给具体的下一步建议。可以问"今天该刷什么"、"我哪一章最弱"、"再来一道关于 X"。', 'en'),
    ).toBe('AI knows your library, wrong-book count, and exam timing, so it can suggest concrete next steps. Ask things like "what should I practice today", "which chapter is weakest", or "give me another question about X".');
    expect(translateStaticText('📸 拍照提问', 'en')).toBe('📸 Ask with Photo');
    expect(translateStaticText('问 AI 陪学…', 'en')).toBe('Ask AI Coach...');
    expect(translateStaticText('7 天前', 'en')).toBe('7 days ago');
    expect(translateStaticText('🔁 克隆', 'en')).toBe('🔁 Clone');
  });

  test('formats profile daily goal metadata in the active language', () => {
    expect(formatProfileMeta(null, 60, 'zh')).toBe('无目标说明 · 每天 60 分钟');
    expect(formatProfileMeta(null, 60, 'en')).toBe('No target note · 60 min/day');
    expect(formatProfileMeta('NPDP pass', 30, 'en')).toBe('NPDP pass · 30 min/day');
  });

  test('refreshes cached source text when React replaces rendered copy', () => {
    const first = resolveTranslatedValue(undefined, '无目标说明', 'en');
    expect(first.translated).toBe('No target note');

    const next = resolveTranslatedValue(first, 'No target note · 60 min/day', 'en');
    expect(next.original).toBe('No target note · 60 min/day');
    expect(next.translated).toBe('No target note · 60 min/day');
  });

  test('formats date picker copy in the active language', () => {
    const date = new Date(2026, 4, 31);

    expect(getDatePickerWeekLabels('zh')).toEqual(['一', '二', '三', '四', '五', '六', '日']);
    expect(getDatePickerWeekLabels('en')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(formatDatePickerMonth(2026, 4, 'zh')).toBe('2026 年 5 月');
    expect(formatDatePickerMonth(2026, 4, 'en')).toBe('May 2026');
    expect(formatDatePickerDisplay(date, 'zh')).toBe('2026 年 5 月 31 日 周日');
    expect(formatDatePickerDisplay(date, 'en')).toBe('May 31, 2026 Sun');
    expect(formatDatePickerTodayAction(date, true, 'en')).toBe('Today, May 31');
    expect(formatDatePickerTodayAction(date, false, 'en')).toBe('📍 Today (May 31)');
  });
});
