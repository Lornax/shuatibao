import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Language = 'zh' | 'en';

const LANGUAGE_KEY = 'lod_language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function getStoredLanguage(storage: Pick<Storage, 'getItem'> | null | undefined): Language {
  const saved = storage?.getItem(LANGUAGE_KEY);
  return saved === 'en' || saved === 'zh' ? saved : 'zh';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    typeof window === 'undefined' ? 'zh' : getStoredLanguage(window.localStorage),
  );

  function setLanguage(next: Language) {
    setLanguageState(next);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // localStorage can be unavailable in private contexts. UI state still works.
    }
  }

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage(language === 'zh' ? 'en' : 'zh'),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}

const EXACT_EN: Record<string, string> = {
  '我的备考': 'My Exams',
  '我的': 'Me',
  '公告': 'Announcements',
  '作者公告': 'Announcements',
  '🔔 作者公告': '🔔 Announcements',
  '反馈': 'Feedback',
  '反馈 bug 或建议': 'Feedback or Suggestion',
  '我提交过的': 'My feedback',
  '遇到什么问题、不顺手的地方、或者想要什么功能都可以写':
    'Tell me what broke, what feels awkward, or what you want next.',
  '取消': 'Cancel',
  '提交': 'Submit',
  '关闭': 'Close',
  '知道啦 👍': 'Got it 👍',
  '还没有公告': 'No announcements yet',
  '关掉之后可以在右上角 🔔 铃铛里再看':
    'You can reopen this from the bell in the top right.',
  '✓ 已收到，会尽快处理\n感谢支持 🙏': '✓ Received. I will handle it soon.\nThanks 🙏',
  '✓ 已收到，会尽快处理': '✓ Received. I will handle it soon.',
  '感谢支持 🙏': 'Thanks 🙏',
  '💬 反馈': '💬 Feedback',
  '📋 我提交过的': '📋 Submitted',
  '附截图（可选，最多 4 张）': 'Attach screenshots (optional, up to 4)',
  '附截图（可选，最多': 'Attach screenshots (optional, up to',
  '张）': ' screenshots)',
  '添加截图': 'Add screenshot',
  '例：拍照识题后保存按钮点不动；想要导出所有错题到 PDF…':
    'Example: the photo-recognition save button does not respond; I want to export all wrong questions to PDF...',
  '⏳ 上传中（最长 20 秒）': '⏳ Uploading (up to 20s)',

  '我的反馈': 'My Feedback',
  '还没提交过反馈': 'No feedback submitted yet',
  '遇到 bug 或想要新功能, 随时点右上角 💬 反馈':
    'When you hit a bug or want a feature, use 💬 Feedback in the top right.',

  '+ 新档案': '+ New Exam',
  '+ 新建第一个档案': '+ Create First Exam',
  '+ 开启下一段': '+ Start Next Goal',
  '加载中...': 'Loading...',
  '加载中…': 'Loading...',
  '主线': 'Active',
  '已归档': 'Archived',
  '无目标说明': 'No target note',
  '更多操作': 'More actions',
  '✎ 编辑': '✎ Edit',
  '📦 归档': '📦 Archive',
  '↩ 取消归档': '↩ Unarchive',
  '🗑 删除': '🗑 Delete',
  '新建档案': 'New Exam',
  '编辑档案': 'Edit Exam',
  '加载档案...': 'Loading exam...',
  '未设考试日期': 'No exam date set',
  '考试日期未设': 'No exam date set',
  '⏱ 今日时长': "⏱ Today's time",
  '📝 今日题数': "📝 Today's questions",
  '已达成': 'Complete',
  '+ 加题': '+ Add Question',
  '教材就绪': 'Textbooks ready',
  'PDF 解析中': 'PDF parsing',
  'AI 出题中': 'AI generating',
  '考试名称': 'Exam Name',
  '目标': 'Target',
  '例：60 分通过': 'Example: pass with 60 points',
  '考试日期': 'Exam Date',
  '选考试日期…': 'Choose exam date...',
  '每日目标': 'Daily Goal',
  '⏱ 按时长': '⏱ By time',
  '📝 按题数': '📝 By questions',
  '小时 / 天': 'hours / day',
  '题 / 天': 'questions / day',
  '0.5 小时': '0.5 h',
  '1 小时': '1 h',
  '2 小时': '2 h',
  '3 小时': '3 h',
  '5 道': '5 questions',
  '10 道': '10 questions',
  '20 道': '20 questions',
  '50 道': '50 questions',
  '← 快捷点选': '← Quick picks',
  '可手填或点 chip 快捷填入。主页只显示这个维度的进度条':
    'Type a value or tap a chip. The exam page shows progress for this goal only.',
  '考试名称必填': 'Exam name is required',
  '建档中...': 'Creating...',
  '建档 ✓': 'Create ✓',
  '保存 ✓': 'Save ✓',

  '昵称': 'Nickname',
  '邮箱': 'Email',
  '📋 我的反馈': '📋 My Feedback',
  '🔒 修改密码': '🔒 Change Password',
  '当前密码': 'Current Password',
  '新密码（至少 6 位）': 'New Password (at least 6 chars)',
  '再输一次新密码': 'Confirm New Password',
  '确认修改': 'Confirm',
  '保存中...': 'Saving...',
  '退出登录': 'Log Out',
  '提示：你账号下的档案、题库、错题、AI 陪学历史都是私有的，登录其他账号看不到。':
    'Your exams, question banks, wrong book, and AI study history are private to this account.',

  '刷题宝': 'Quiz Buddy',
  '有书有题,': 'Books, questions,',
  '考试有底': 'confidence.',
  '有书有题, 考试有底': 'Books, questions, confidence.',
  '有书有题，考试有底': 'Books, questions, confidence.',
  '© 刷题宝 · 有书有题, 考试有底': '© Quiz Buddy · Books, questions, confidence.',
  '加油!': 'Keep going!',
  '账号 / 邮箱': 'Account / Email',
  '密码': 'Password',
  '记住我': 'Remember me',
  '登录': 'Log In',
  '登录中...': 'Logging in...',
  '还没有账号？': 'No account yet?',
  '去注册 →': 'Register →',
  '建一个账号': 'Create Account',
  '从今天开始,': 'Start today,',
  '一题一题': 'one question at a time',
  '积累': 'and keep building.',
  '从今天开始, 一题一题积累': 'Start today, one question at a time.',
  '密码（至少 6 位）': 'Password (at least 6 chars)',
  '注册并登录': 'Register and Log In',
  '建账号中...': 'Creating account...',
  '已有账号？': 'Already have an account?',
  '去登录 →': 'Log in →',
  '注册即同意 《简单备考承诺》': 'By registering, you agree to the simple study commitment.',

  '加题': 'Add Question',
  '选一个加题方式': 'Choose how to add questions',
  '手输': 'Manual Entry',
  '一道一道敲': 'Type one by one',
  '拍照识题': 'Photo Recognition',
  '拍真题书页 AI 自动识别': 'Photograph a page and let AI parse it',
  'PDF 导入': 'PDF Import',
  '上传 PDF AI 解析批量入库': 'Upload a PDF and import questions in bulk',
  'AI 生成': 'AI Generate',
  'AI 出题': 'AI Generate',
  '给个知识点 AI 出题': 'Give AI a topic and generate questions',
  '把题目敲进来...': 'Type the question here...',
  '选项 + 标记正确答案': 'Options + Mark Correct Answer',
  '解析（选填）': 'Explanation (optional)',
  '标签（选填，逗号分隔）': 'Tags (optional, comma-separated)',
  '例：易错、BCG矩阵': 'Example: tricky, BCG matrix',
  '历史标签（点击追加）：': 'Past tags (tap to add):',
  '难度': 'Difficulty',
  '保存继续': 'Save and Continue',
  '保存返回': 'Save and Return',

  '教材库': 'Textbooks',
  '📚 教材库': '📚 Textbooks',
  'AI 引用章节': 'AI references chapters',
  '📚 教材决定 AI 的精准度': '📚 Textbooks make AI more accurate',
  '没导入教材': 'No textbook imported',
  '导入教材后': 'After importing textbooks',
  '：AI 答题、解析、出题都靠通用知识回答，章节 / 页码可能不准，甚至会编造。':
    ': AI answers, explanations, and generated questions rely on general knowledge, so chapters/pages may be inaccurate.',
  '：AI 优先引用教材原文，解析末尾标注': ': AI prioritizes textbook excerpts and marks explanations with',
  '[第 X 章·第 Y 页]': '[Chapter X · Page Y]',
  '，让你能直接翻书核对。': ', so you can check the book directly.',
  '上传 PDF（≤50MB），几百页的教材需要几分钟解析 + 嵌入。':
    'Upload a PDF (≤50MB). Large textbooks can take a few minutes to parse and embed.',
  '📚 上传教材 PDF': '📚 Upload Textbook PDF',
  '点这里选 PDF（≤50MB）': 'Choose PDF (≤50MB)',
  '上传中...': 'Uploading...',
  '还没有教材，上传一份开始用': 'No textbooks yet. Upload one to start.',
  '加载中': 'Loading',
  '处理中': 'Processing',
  '✓ 可用': '✓ Ready',
  '✗ 失败': '✗ Failed',
  '没有识别到章节': 'No chapters detected',
  '未识别章节': 'Unrecognized chapter',
  '📄 下载原文件': '📄 Download original',
  '♻ 重新处理': '♻ Reprocess',
  '正在解析 + 嵌入...（PDF 大概几分钟，关掉页面也会继续）':
    'Parsing and embedding... This can take a few minutes and continues if you leave the page.',
  '删除': 'Delete',

  '错题本': 'Wrong Book',
  '查看': 'View',
  '主动建议': 'Active coaching',
  '还没有错题——要么没刷过，要么全掌握 🌟':
    'No wrong questions yet. Either you have not practiced, or you have mastered everything 🌟',
  '主动加入': 'Manually added',
  '答错自动加入': 'Auto-added after a wrong answer',
  '你选：': 'You chose: ',
  '正确：': 'Correct: ',
  '尚未在此档案答错过': 'No wrong attempts in this exam yet',
  '错题本里的题会一直保留，直到你连续答对':
    'Wrong-book questions stay here until you answer correctly',
  '次。蒙对的、印象深的题也可以在答题页主动加入。':
    'times in a row. You can also add memorable questions from the quiz page.',
  '错题本里的题会一直保留，直到你连续答对 3 次。蒙对的、印象深的题也可以在答题页主动加入。':
    'Wrong-book questions stay here until you answer correctly 3 times in a row. You can also add memorable questions from the quiz page.',
  '移除': 'Remove',
  '移除中...': 'Removing...',
  '再练一遍（只刷错题） →': 'Practice Again (wrong questions only) →',

  '最近的题': 'Recent Questions',
  '开始刷题 →': 'Start Quiz →',
  '管理全部 →': 'Manage All →',
  '还没有题，先加几道再来': 'No questions yet. Add a few first.',
  '点击答这道 →': 'Tap to answer →',

  'AI 陪学': 'AI Coach',
  '💬 AI 陪学': '💬 AI Coach',
  'AI 知道你的题库情况、错题数和距考时间，会给具体的下一步建议。可以问"今天该刷什么"、"我哪一章最弱"、"再来一道关于 X"。':
    'AI knows your library, wrong-book count, and exam timing, so it can suggest concrete next steps. Ask things like "what should I practice today", "which chapter is weakest", or "give me another question about X".',
  '还没有对话': 'No conversation yet',
  '📸 拍照提问': '📸 Ask with Photo',
  '🖼 上传截图': '🖼 Upload Screenshot',
  '图片已选，发送时会一起带给 AI': 'Image selected. It will be sent with your message.',
  '移除图片': 'Remove image',
  '发送': 'Send',
  '清空': 'Clear',
  '问 AI…': 'Ask AI...',
  '问 AI 陪学…': 'Ask AI Coach...',
  '问图里的问题, 留空则默认 "看这张图"…': 'Ask about the image, or leave blank to send "look at this image"...',
  '清空对话（重新打招呼）': 'Clear chat (restart greeting)',
  '待发送': 'To send',
  '放大查看': 'Zoom image',
  '附图': 'Attached image',
  '🤖 思考中...': '🤖 Thinking...',
  '跟 AI 聊这道题': 'Chat with AI about this question',

  '待审队列': 'Review Queue',
  '回待审队列': 'Back to Review Queue',
  '审核': 'Review',
  '这一条已经处理过了。': 'This item has already been handled.',
  '全部审完啦': 'All Reviewed',
  '这次导入已全部入库或丢弃。': 'Everything in this import has been saved or discarded.',
  '回档案': 'Back to Exam',
  '批量动作': 'Batch Actions',
  '缺答案': 'Missing Answer',
  '丢弃': 'Discard',
  '✓ 通过': '✓ Approve',
  '📄 原文件': '📄 Original File',

  '题库还空着': 'Library is empty',
  '这组筛选下没有题': 'No questions match these filters',
  '筛选': 'Filters',
  '筛选 ▴': 'Filters ▴',
  '筛选 ▾': 'Filters ▾',
  '编辑': 'Edit',
  '🔁 克隆': '🔁 Clone',
  '搜题干 / 标签 / 章节...': 'Search stem / tags / chapter...',
  '正在为搜索加载全部题...': 'Loading all questions for search...',
  '搜题干...': 'Search stem...',
  '搜标签...': 'Search tags...',
  '搜章节...': 'Search chapters...',
  '搜索范围': 'Search Scope',
  '全部': 'All',
  '题干': 'Stem',
  '章节': 'Chapter',
  '标签': 'Tags',
  '按日期': 'By Date',
  '全部时间': 'All Time',
  '今天': 'Today',
  '近 7 天': 'Last 7 Days',
  '近 30 天': 'Last 30 Days',
  '按来源': 'By Source',
  '按难度': 'By Difficulty',
  '排序': 'Sort',
  '导入时间': 'Import Time',
  '题干字母': 'Stem A-Z',
  '准确率': 'Accuracy',
  '↑ 升序': '↑ Asc',
  '↓ 降序': '↓ Desc',
  '清空全部筛选': 'Clear All Filters',
  '维护工具': 'Maintenance',
  '危险操作': 'Danger Zone',
  '☐ 多选': '☐ Multi-select',
  '✓ 多选中': '✓ Selecting',
  '取消选择': 'Cancel Selection',
  '全选': 'Select All',
  '加载全量...': 'Loading all...',
  '一键去重 (按题干相同合并)': 'Dedupe by identical stem',
  '选项 + 答案': 'Options + Answer',
  '解析': 'Explanation',
  '加载更多': 'Load More',
  '保存': 'Save',

  '拍照': 'Take Photo',
  '📸 拍照': '📸 Take Photo',
  '🖼 从相册选': '🖼 Choose From Album',
  '手机直接开相机': 'Open camera on mobile',
  '已有的图片': 'Existing image',
  '拍一张或从相册选一张题目图，下一步可以裁剪出单道题。':
    'Take or choose a question image. You can crop one question in the next step.',
  '直接拖框四角调大小，或长按框内移动位置。': 'Drag corners to resize, or hold and move inside the crop box.',
  '自由模式：长宽随便拉。': 'Free mode: drag any width or height.',
  '比例': 'Aspect',
  '🤚 自由': '🤚 Free',
  '待裁剪': 'To crop',
  '准备好了。确认上传给 AI 识别题干、选项、答案。':
    'Ready. Upload to let AI identify the stem, options, and answer.',
  '重选': 'Choose Again',
  '用原图': 'Use Original',
  '确认裁剪 →': 'Confirm Crop →',
  '重选 / 重裁': 'Choose / Crop Again',
  '开始识别': 'Start Recognition',
  '识别中…': 'Recognizing...',
  '上传图片': 'Upload Image',
  'AI 看图思考': 'AI Reading Image',
  '整理结构化结果': 'Structuring Result',

  '⬆️ 上传新 PDF': '⬆️ Upload New PDF',
  '真题 PDF（≤20MB），AI 解析后让你逐题确认。':
    'Exam PDF (≤20MB). AI parses it, then you confirm each question.',
  '点这里选 PDF': 'Choose PDF',
  '当前有任务在解析，先等它完。': 'A task is currently parsing. Wait for it to finish first.',
  '提示：识别开始 3 批后还是 0 道题, 系统会自动停掉并标"可能不是题目 PDF", 不再浪费 token。':
    'Tip: if recognition still finds 0 questions after 3 batches, the system stops and marks it as "probably not a question PDF" to avoid wasting tokens.',
  '📋 这个档案的 PDF 任务': '📋 PDF tasks for this exam',
  '提交中...': 'Submitting...',
  '当前有任务解析中': 'A task is parsing',
  '开始解析': 'Start Parsing',
  '🔁 仍然重新跑一份新的': '🔁 Run a fresh import anyway',
  '查看进度 →': 'View Progress →',

  '有教材就基于教材出题，没教材就靠考试常识。AI 把题做出来，你来挑。':
    'Generate from textbooks when available, otherwise from exam knowledge. AI drafts the questions; you choose what to keep.',
  '出题模式': 'Generation Mode',
  '📖 指定章节': '📖 By chapter',
  '🔑 按知识点': '🔑 By topic',
  '🎲 随机': '🎲 Random',
  '锁定一个章节出题（教材就绪时最准）': 'Generate from one chapter. Best when textbooks are ready.',
  '按你写的关键词出题': 'Generate from your keywords.',
  'AI 自由发挥常考要点（教材就绪会偏教材内容）':
    'Let AI choose common exam points. Ready textbooks will guide the content.',
  '教材章节': 'Textbook Chapter',
  '教材章节（选填）': 'Textbook Chapter (optional)',
  '（选填）': ' (optional)',
  '（选填，逗号分隔）': ' (optional, comma-separated)',
  '输入或从已识别章节中选': 'Type or choose from detected chapters',
  '例：第 3 章（上传教材后这里会自动补全）': 'Example: Chapter 3 (auto-filled after textbook upload)',
  '知识点关键词': 'Topic Keywords',
  '知识点关键词 *': 'Topic Keywords *',
  '例：产品生命周期的成熟期特征': 'Example: maturity-stage features in the product life cycle',
  '出题数量': 'Question Count',
  '1 道（单题确认）': '1 question (confirm first)',
  '一道': '1 question',
  '批量出题不走单题确认页，AI 出完直接入库，事后到题库管理审/改':
    'Batch generation skips single-question confirmation. AI saves directly to the library; review or edit afterward in Library.',
  '🎲 AI 帮我出': '🎲 Generate',
  '🎲 AI 帮我出 一道': '🎲 Generate 1 question',
  '🤖 AI 出题中…': '🤖 Generating...',
  '取消（已生成的保留）': 'Cancel (keep generated questions)',
  '→ 去题库管理': '→ Go to Library',
  '🔁 再来一批': '🔁 Generate another batch',
};

const REGEX_EN: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^已归档 \((\d+)\)$/, (m) => `Archived (${m[1]})`],
  [/^每天 (\d+) 分钟$/, (m) => `${m[1]} min/day`],
  [/^今天 .+ · 考试日期未设 · 题库 (\d+) 道，跟 AI 教练定个今日计划 →$/, (m) => {
    const count = Number(m[1]);
    return `Today · No exam date set · ${m[1]} ${count === 1 ? 'question' : 'questions'} in library. Ask the AI coach for today's plan →`;
  }],
  [/^(\d+)月(\d+)日周([一二三四五六日]) ·$/, (m) => {
    const weekdays: Record<string, string> = {
      一: 'Mon',
      二: 'Tue',
      三: 'Wed',
      四: 'Thu',
      五: 'Fri',
      六: 'Sat',
      日: 'Sun',
    };
    return `${MONTH_LABELS_EN[Number(m[1]) - 1]} ${Number(m[2])} ${weekdays[m[3]]} ·`;
  }],
  [/^今天 (\d+)月(\d+)日周([一二三四五六日]) ·$/, (m) => {
    const weekdays: Record<string, string> = {
      一: 'Mon',
      二: 'Tue',
      三: 'Wed',
      四: 'Thu',
      五: 'Fri',
      六: 'Sat',
      日: 'Sun',
    };
    return `Today ${MONTH_LABELS_EN[Number(m[1]) - 1]} ${Number(m[2])} ${weekdays[m[3]]} ·`;
  }],
  [/^Today (\d+)月(\d+)日周([一二三四五六日]) ·$/, (m) => {
    const weekdays: Record<string, string> = {
      一: 'Mon',
      二: 'Tue',
      三: 'Wed',
      四: 'Thu',
      五: 'Fri',
      六: 'Sat',
      日: 'Sun',
    };
    return `Today ${MONTH_LABELS_EN[Number(m[1]) - 1]} ${Number(m[2])} ${weekdays[m[3]]} ·`;
  }],
  [/^考试日期未设 · 题库 (\d+) 道，跟 AI 教练定个今日计划 →$/, (m) => {
    const count = Number(m[1]);
    return `No exam date set · ${m[1]} ${count === 1 ? 'question' : 'questions'} in library. Ask the AI coach for today's plan →`;
  }],
  [/^考试日期未设 · 题库还空着，找 AI 教练聊聊从哪开始 →$/, () =>
    'No exam date set · Library is empty. Ask the AI coach where to start →'],
  [/^今天 .+ · 考试日期未设 · 题库还空着，找 AI 教练聊聊从哪开始 →$/, () =>
    'Today · No exam date set · Library is empty. Ask the AI coach where to start →'],
  [/^今天 .+ · 距考还剩 (\d+) 天 · 题库 (\d+) 道，跟 AI 教练定个今日计划 →$/, (m) =>
    `Today · ${m[1]} days until exam · ${m[2]} questions in library. Ask the AI coach for today's plan →`],
  [/^今天 .+ · 考期已过 (\d+) 天 · 题库 (\d+) 道，跟 AI 教练定个今日计划 →$/, (m) =>
    `Today · Exam passed ${m[1]} days ago · ${m[2]} questions in library. Ask the AI coach for today's plan →`],
  [/^距考还剩 (\d+) 天$/, (m) => `${m[1]} days until exam`],
  [/^考期已过 (\d+) 天$/, (m) => `Exam passed ${m[1]} days ago`],
  [/^📅 (.+) · 距考 (\d+) 天$/, (m) => `📅 ${m[1]} · ${m[2]} days until exam`],
  [/^📅 (.+) · 考期已过 (\d+) 天$/, (m) => `📅 ${m[1]} · Exam passed ${m[2]} days ago`],
  [/^(\d+) \/ (\d+) 分钟$/, (m) => `${m[1]} / ${m[2]} min`],
  [/^(\d+) \/ (\d+) 题$/, (m) => `${m[1]} / ${m[2]} questions`],
  [/^教材就绪 · (\d+) 本 · (\d+) 章 · (\d+) 段$/, (m) => `Textbooks ready · ${m[1]} books · ${m[2]} chapters · ${m[3]} chunks`],
  [/^注册于 (.+)$/, (m) => `Joined ${m[1]}`],
  [/^最近 (\d+) 条$/, (m) => `Latest ${m[1]}`],
  [/^题库 \((\d+)\)$/, (m) => `Library (${m[1]})`],
  [/^共 (\d+) 道 · 进入题库管理查看全部 →$/, (m) => `${m[1]} total · View all in Library →`],
  [/^已加载 (\d+) \/ (\d+) 道$/, (m) => `Loaded ${m[1]} / ${m[2]}`],
  [/^已加载全部 (\d+) 道$/, (m) => `Loaded all ${m[1]}`],
  [/^答案：$/, () => 'Answer:'],
  [/^答案：(.+)$/, (m) => `Answer:${m[1]}`],
  [/^历史错过 (\d+) 次$/, (m) => `Wrong ${m[1]} times before`],
  [/^答对 (\d+) \/ (\d+) 后自动移除$/, (m) => `Auto-remove after ${m[1]} / ${m[2]} correct`],
  [/^错题本里的题会一直保留，直到你连续答对 (\d+) 次。蒙对的、印象深的题也可以在答题页主动加入。$/, (m) =>
    `Wrong-book questions stay here until you answer correctly ${m[1]} times in a row. You can also add memorable questions from the quiz page.`],
  [/^(\d+) 天前$/, (m) => `${m[1]} days ago`],
  [/^(\d+) 小时前$/, (m) => `${m[1]} hours ago`],
  [/^(\d+) 分钟前$/, (m) => `${m[1]} minutes ago`],
  [/^刚刚$/, () => 'Just now'],
  [/^选项 ([A-Z])$/, (m) => `Option ${m[1]}`],
  [/^截图 (\d+)$/, (m) => `Screenshot ${m[1]}`],
  [/^全选 \((\d+)\)$/, (m) => `Select All (${m[1]})`],
  [/^删除 (\d+)$/, (m) => `Delete ${m[1]}`],
  [/^⚠ 清空当前筛选 \((\d+) 道\)$/, (m) => `⚠ Clear filtered (${m[1]})`],
  [/^⚠ 清空全部题库 \((\d+) 道\)$/, (m) => `⚠ Clear all questions (${m[1]})`],
  [/^已生成 (\d+) 道$/, (m) => `Generated ${m[1]} questions`],
  [/^✓ 用现有 (\d+) 道$/, (m) => `✓ Use existing ${m[1]} questions`],
  [/^▶ 续传剩下 (\d+) 批$/, (m) => `▶ Resume remaining ${m[1]} batches`],
  [/^解析中 · (\d+)\/(\d+) 批$/, (m) => `Parsing · ${m[1]}/${m[2]} batches`],
  [/^已完成 · 共 (\d+) 道$/, (m) => `Completed · ${m[1]} total`],
  [/^中断 · 已识别 (\d+)\/(\d+) 批 · (\d+) 道$/, (m) =>
    `Interrupted · recognized ${m[1]}/${m[2]} batches · ${m[3]} questions`],
  [/^共 (\d+) 道，点击继续审$/, (m) => `${m[1]} total. Continue review`],
  [/^(\d+) 道待审$/, (m) => `${m[1]} pending review`],
  [/^第 (\d+) 页$/, (m) => `Page ${m[1]}`],
  [/^(\d+) 页$/, (m) => `${m[1]} pages`],
  [/^(\d+) 段$/, (m) => `${m[1]} chunks`],
  [/^(\d+) 章$/, (m) => `${m[1]} chapters`],
  [/^(\d+) 道$/, (m) => `${m[1]} questions`],
  [/^难度 (★+)$/, (m) => `Difficulty ${m[1]}`],
  [/^准确率 ([\d.]+)% \((\d+)\/(\d+)\)$/, (m) => `Accuracy ${m[1]}% (${m[2]}/${m[3]})`],
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

type TranslationSnapshot = {
  original: string;
  translated: string;
};

export function translateStaticText(text: string, language: Language): string {
  if (language === 'zh') return text;
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  const compact = normalizeText(text);
  if (!compact) return text;
  const exact = EXACT_EN[compact];
  if (exact) return `${leading}${exact}${trailing}`;
  for (const [pattern, render] of REGEX_EN) {
    const match = compact.match(pattern);
    if (match) return `${leading}${render(match)}${trailing}`;
  }
  return text;
}

export function resolveTranslatedValue(
  snapshot: TranslationSnapshot | undefined,
  current: string,
  language: Language,
): TranslationSnapshot {
  const original =
    snapshot && (current === snapshot.original || current === snapshot.translated)
      ? snapshot.original
      : current;
  return {
    original,
    translated: language === 'zh' ? original : translateStaticText(original, language),
  };
}

export function formatProfileMeta(target: string | null, dailyMinutes: number, language: Language): string {
  if (language === 'en') {
    return `${target ?? 'No target note'} · ${dailyMinutes} min/day`;
  }
  return `${target ?? '无目标说明'} · 每天 ${dailyMinutes} 分钟`;
}

const DATE_PICKER_WEEK_LABELS: Record<Language, string[]> = {
  zh: ['一', '二', '三', '四', '五', '六', '日'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

const DATE_PICKER_FULL_WEEKDAYS: Record<Language, string[]> = {
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const MONTH_LABELS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getDatePickerWeekLabels(language: Language): string[] {
  return DATE_PICKER_WEEK_LABELS[language];
}

export function formatDatePickerMonth(year: number, monthIndex: number, language: Language): string {
  if (language === 'en') return `${MONTH_LABELS_EN[monthIndex]} ${year}`;
  return `${year} 年 ${monthIndex + 1} 月`;
}

export function formatDatePickerDisplay(date: Date, language: Language): string {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const day = date.getDate();
  const weekday = DATE_PICKER_FULL_WEEKDAYS[language][date.getDay()];
  if (language === 'en') return `${MONTH_LABELS_EN[monthIndex]} ${day}, ${year} ${weekday}`;
  return `${year} 年 ${monthIndex + 1} 月 ${day} 日 ${weekday}`;
}

export function formatDatePickerTodayAction(today: Date, isViewingToday: boolean, language: Language): string {
  const monthIndex = today.getMonth();
  const day = today.getDate();
  if (language === 'en') {
    const label = `${MONTH_LABELS_EN[monthIndex]} ${day}`;
    return isViewingToday ? `Today, ${label}` : `📍 Today (${label})`;
  }
  return isViewingToday ? `今天 ${monthIndex + 1} 月 ${day} 日` : `📍 回到今天 (${monthIndex + 1} 月 ${day} 日)`;
}

const textNodeOriginals = new WeakMap<Text, TranslationSnapshot>();
const attrOriginals = new WeakMap<Element, Map<string, TranslationSnapshot>>();
const TRANSLATED_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_TEXT_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SVG', 'PATH']);
const SKIP_ATTR_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH']);

function shouldSkipTextElement(element: Element): boolean {
  if (SKIP_TEXT_TAGS.has(element.tagName)) return true;
  return !!element.closest('[data-no-i18n]');
}

function shouldSkipAttrElement(element: Element): boolean {
  if (SKIP_ATTR_TAGS.has(element.tagName)) return true;
  return !!element.closest('[data-no-i18n]');
}

function translateTextNode(node: Text, language: Language) {
  const parent = node.parentElement;
  if (!parent || shouldSkipTextElement(parent)) return;
  const current = node.nodeValue ?? '';
  const next = resolveTranslatedValue(textNodeOriginals.get(node), current, language);
  textNodeOriginals.set(node, next);
  node.nodeValue = next.translated;
}

function translateAttributes(element: Element, language: Language) {
  if (shouldSkipAttrElement(element)) return;
  let originals = attrOriginals.get(element);
  if (!originals) {
    originals = new Map<string, TranslationSnapshot>();
    attrOriginals.set(element, originals);
  }
  for (const attr of TRANSLATED_ATTRS) {
    const current = element.getAttribute(attr);
    if (!current) continue;
    const next = resolveTranslatedValue(originals.get(attr), current, language);
    originals.set(attr, next);
    element.setAttribute(attr, next.translated);
  }
}

function applyLanguage(root: ParentNode, language: Language) {
  if (root instanceof Element) translateAttributes(root, language);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      translateTextNode(current as Text, language);
    } else if (current instanceof Element) {
      translateAttributes(current, language);
    }
    current = walker.nextNode();
  }
}

export function LanguageDomTranslator() {
  const { language } = useLanguage();

  useEffect(() => {
    let applying = false;
    const run = () => {
      if (!document.body || applying) return;
      applying = true;
      applyLanguage(document.body, language);
      applying = false;
    };
    run();
    const observer = new MutationObserver(() => {
      if (applying) return;
      window.requestAnimationFrame(run);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATED_ATTRS],
    });
    return () => observer.disconnect();
  }, [language]);

  return null;
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      data-no-i18n
      className={`border-2 border-ink rounded-thick bg-white hover:bg-chip-cream font-cn font-bold text-ink shadow-brutal-light active:translate-y-px ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
      aria-label={language === 'zh' ? '切换到英文' : 'Switch to Chinese'}
      title={language === 'zh' ? '切换到英文' : 'Switch to Chinese'}
    >
      {language === 'zh' ? '中 / EN' : 'EN / 中'}
    </button>
  );
}
