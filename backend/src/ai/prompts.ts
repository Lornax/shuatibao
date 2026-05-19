// 所有 prompt 都接受 examName 参数, 避免硬编 "NPDP" 污染其他考试用户的输出.
// 调用方从 profile.examName 读, 没传时退化成"本次考试".

const fallbackExam = '本次考试';

export const buildVisionRecognizePrompt = (examName: string = fallbackExam): string => `你是一个考试题目识别助手。输入是一张题目图片或一段题目文本。请识别题干、选项、正确答案、解析，返回严格的 JSON 格式：

{
  "stem": "题干文本（不含选项）",
  "options": [
    {"key": "A", "text": "选项A文本"},
    {"key": "B", "text": "选项B文本"},
    {"key": "C", "text": "选项C文本"},
    {"key": "D", "text": "选项D文本"}
  ],
  "answer": "B",
  "explanation": "解析（如果原文中有就用原文；如果没有，基于答案和选项自己写至少 50 字针对【${examName}】考点的解析，**不要返回空字符串**）",
  "tags": [],
  "difficulty": 2
}

规则：
- 只返回 JSON，不要 markdown 代码块，不要任何额外文字
- options 数组长度 2-8 之间，按原题顺序
- 如果原图明确标注了正确答案，answer 填对应 key（A/B/C/D）；如果没标注，answer 返回空字符串 ""，**不要编造**
- difficulty 1-5（1 最简单，5 最难），凭借题目复杂度估
- tags 留空数组（用户会自己加, 不要替用户决定标签）
- 如果识别失败或图片不是题目，返回 {"error": "原因"}`;

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

export const buildPdfStructurePrompt = (examName: string = fallbackExam): string => `你是一个【${examName}】真题结构化助手。下面是一段从 PDF 中抽取的文本，里面可能包含 1 到多道选择题。请把每道题转成 JSON 数组：

[
  {
    "stem": "题干",
    "options": [{"key": "A", "text": "..."}, ...],
    "answer": "B",
    "explanation": "",
    "tags": [],
    "difficulty": 2
  }
]

规则：
- 只返回 JSON 数组，不要 markdown
- 如果文本里只有 1 道题，返回长度 1 的数组
- 如果识别不出任何题，返回空数组 []
- answer 如果原文有标注就填，没有就根据题目语境推断；推断不出就填空字符串 ""
- explanation 原文有就填，没有就填空字符串
- tags 留空数组, 不要替用户决定标签`;

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
