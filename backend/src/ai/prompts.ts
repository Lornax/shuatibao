// 所有 prompt 都接受 examName 参数, 避免硬编 "NPDP" 污染其他考试用户的输出.
// 调用方从 profile.examName 读, 没传时退化成"本次考试".

const fallbackExam = '本次考试';

export const buildVisionRecognizePrompt = (examName: string = fallbackExam): string => `你是一个【${examName}】考试题目识别助手。输入是一张题目图片或一段题目文本。先识别题型, 再返回严格 JSON。

题型 (type) 三选一:
- "single": 单选题 (默认, 4 选 1 或 5 选 1)
- "multi":  多选题 (题目明确说"多选"或"全选"或选项里有多个对的)
- "judge":  判断题 (只有"对/错"两种, 或"正确/错误", 或 T/F)

返回:
{
  "type": "single",
  "stem": "题干文本（不含选项）",
  "options": [
    {"key": "A", "text": "选项A文本"},
    {"key": "B", "text": "选项B文本"}
  ],
  "answer": "B",
  "explanation": "至少 50 字针对【${examName}】考点的解析",
  "tags": [],
  "difficulty": 2
}

关键规则:
- 只返回 JSON, 不要 markdown 代码块
- **single/multi**: options 长度 2-8, key 用 A/B/C/D...
  · single: answer = 单个 key, 如 "B"
  · multi: answer = 排序后的 key 用英文逗号连接, 如 "A,C" 或 "A,B,D"
- **judge**: options 固定 [{"key":"T","text":"对"},{"key":"F","text":"错"}], answer = "T" 或 "F"
- 答案没标注就返回空字符串 "", **不要编造**
- difficulty 1-5
- tags 留空数组
- 识别失败返回 {"error": "原因"}`;

export const buildPromptGenPrompt = (examName: string = fallbackExam): string => `你是一个【${examName}】出题专家。根据用户给的知识点 + 上下文（教材章节、考点关键词），出一道高质量选择题。

返回严格的 JSON 格式：

{
  "stem": "题干",
  "options": [
    {"key": "A", "text": "选项A"},
    {"key": "B", "text": "选项B"},
    {"key": "C", "text": "选项C"},
    {"key": "D", "text": "选项D"}
  ],
  "answer": "B",
  "explanation": "为什么选这个答案，并说明其他选项的错处",
  "tags": [],
  "difficulty": <用户指定的难度>
}

规则：
- 只返回 JSON，不要 markdown 代码块
- 4 个选项要互斥且具有迷惑性，不能明显有 1 个对其他都错
- explanation 至少 50 字, 紧扣【${examName}】的知识体系, 不要扯到其他考试
- tags 留空数组（用户会自己加）
- 如果用户提供了教材章节 / 考点关键词，紧扣这些信息出题
- **如果系统消息后面附带了"教材片段"参考**：题干和 explanation 必须基于这些片段；在 explanation 末尾追加引用 [第X章·第Y页]（章节/页码取自教材片段的标注，不要编造）。让用户能溯源到教材原文`;

export const buildPdfStructurePrompt = (examName: string = fallbackExam): string => `你是一个【${examName}】真题结构化助手。下面文本可能含 1 到多道题, 题型可能是单选/多选/判断。请转成 JSON 数组:

[
  {
    "type": "single",
    "stem": "题干",
    "options": [{"key": "A", "text": "..."}],
    "answer": "B",
    "explanation": "",
    "tags": [],
    "difficulty": 2
  }
]

题型识别:
- "single": 单选 (默认, 选 1 个)
- "multi":  多选 (题面有"多选"/"全选"或多个正确选项)
- "judge":  判断题 (只有对错两种, options 固定 [{"key":"T","text":"对"},{"key":"F","text":"错"}])

answer 规则:
- single: 单个 key, 如 "B"
- multi: 排序后 key 逗号连接, 如 "A,C"
- judge: "T" 或 "F"
- 原文无标注则推断, 推断不出填空字符串

规则:
- 只返回 JSON 数组, 不要 markdown
- 如识别不出任何题, 返回 []
- explanation/tags 留空, 让用户/后端补`;

export const buildSolvePrompt = (
  stem: string,
  options: string,
  examName: string = fallbackExam,
): string => `你是一个【${examName}】解题专家。下面是一道选择题，请推理出最可能的正确答案。

题干：${stem}
选项：
${options}

返回严格的 JSON：
{
  "answer": "B",
  "explanation": "为什么选这个，至少 50 字, 结合【${examName}】的知识体系说明, 不要扯到其他考试"
}

answer 必须是给定 options 里某个 key。只返回 JSON，无 markdown 代码块。`;

// 向后兼容: 老的常量名导出, 用 fallback examName
export const VISION_RECOGNIZE_PROMPT = buildVisionRecognizePrompt();
export const PROMPT_GEN_PROMPT = buildPromptGenPrompt();
export const PDF_STRUCTURE_PROMPT = buildPdfStructurePrompt();
export const SOLVE_PROMPT = buildSolvePrompt('{stem}', '{options}');
