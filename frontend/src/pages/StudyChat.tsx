import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type ChatMessage } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Textarea } from '../components/Input';
import { Layout } from '../components/Layout';
import { compressImage } from '../utils/image';
import { useLanguage } from '../i18n';

/**
 * Profile-scoped AI study companion. First mount: fetch history; if empty,
 * ask the backend to generate a personalized welcome. Subsequent messages
 * go through POST /study-chat; system prompt on the server includes the
 * latest study stats so DeepSeek can give concrete next-step advice.
 */
export function StudyChat() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [importingMid, setImportingMid] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pid) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.listStudyChat(pid);
        if (cancelled) return;
        if (r.messages.length === 0) {
          // first time entering this profile's study chat — ask AI to open
          setWarming(true);
          try {
            const w = await api.ensureStudyWelcome(pid, language);
            if (cancelled) return;
            setMessages(w.message ? [w.message] : []);
          } catch (e) {
            setError(String(e));
            setMessages([]);
          } finally {
            setWarming(false);
          }
        } else if (shouldRegenerateWelcome(r.messages, language)) {
          setWarming(true);
          try {
            await api.clearStudyChat(pid);
            const w = await api.ensureStudyWelcome(pid, language);
            if (cancelled) return;
            setMessages(w.message ? [w.message] : []);
          } catch (e) {
            setError(String(e));
            setMessages(r.messages);
          } finally {
            setWarming(false);
          }
        } else {
          setMessages(r.messages);
        }
      } catch (e) {
        setError(String(e));
        setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pid, language]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending, warming]);

  async function send() {
    const content = draft.trim();
    // 允许只发图 (content 自动给个占位)
    const finalContent = content || (imageDataUrl ? (language === 'en' ? 'Look at this image' : '看这张图') : '');
    if (!finalContent || sending || !pid) return;
    const attachedImage = imageDataUrl;
    const tempUser: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: finalContent,
      imageData: attachedImage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...(prev ?? []), tempUser]);
    setDraft('');
    setImageDataUrl(null);
    if (cameraRef.current) cameraRef.current.value = '';
    if (albumRef.current) albumRef.current.value = '';
    setSending(true);
    setError(null);
    try {
      const r = await api.postStudyChat(pid, finalContent, attachedImage ?? undefined);
      setMessages((prev) =>
        (prev ?? [])
          .filter((m) => m.id !== tempUser.id)
          .concat([r.userMessage, r.assistantMessage]),
      );
    } catch (e) {
      setError(String(e));
      setMessages((prev) => (prev ?? []).filter((m) => m.id !== tempUser.id));
      setDraft(content);
      if (attachedImage) setImageDataUrl(attachedImage);
    } finally {
      setSending(false);
    }
  }

  /**
   * 用户在带图的气泡下方点「📚 加入题库」, 流程:
   * 1. 调 parseImageDataUrl 让 AI 识题 → candidate
   * 2. 把这条用户消息后第一条 assistant 回复作为 explanation 预填
   *    (AI 在陪学已经讲过一遍, 用户多半是想留住这份讲解)
   * 3. 跳 QuestionConfirm 路由, 带 studyMessageId 标记入库模式
   */
  async function startImport(msg: ChatMessage) {
    if (!pid || !msg.imageData) return;
    setImportingMid(msg.id);
    setError(null);
    try {
      // 收集这条用户消息之后**关于这道题**的讨论作为上下文.
      // 边界: 遇到下一条带图的 user 消息 = 用户在问新题, 截断; 最多 8 条兜底.
      const list = messages ?? [];
      const idx = list.findIndex((m) => m.id === msg.id);
      const after = idx >= 0 ? list.slice(idx + 1) : [];
      const followups: ChatMessage[] = [];
      for (const m of after) {
        // 遇到入库 marker → 上一题已结案, 截断
        if (m.isNote) break;
        // 遇到下一条带图 user 消息 → 用户在问新题, 截断
        if (m.role === 'user' && m.imageData) break;
        followups.push(m);
        if (followups.length >= 8) break;
      }
      const conversationContext = followups
        .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n\n');
      const r = await api.parseImageDataUrl(pid, msg.imageData, conversationContext || undefined);
      const candidate = { ...r.candidate };
      nav(`/profiles/${pid}/questions/confirm`, {
        state: {
          candidate,
          source: 'photo',
          studyMessageId: msg.id,
          wrongbookByDefault: true,
          sourceMeta: { from: 'chat' },
        },
      });
    } catch (e) {
      setError(`识题失败: ${e}`);
    } finally {
      setImportingMid(null);
    }
  }

  async function pickImage(file: File) {
    setError(null);
    try {
      const dataUrl = await compressImage(file, 1600, 0.85);
      setImageDataUrl(dataUrl);
    } catch (e) {
      setError(`图片读取失败: ${e}`);
    }
  }

  async function clearAll() {
    if (!pid || !messages || messages.length === 0) return;
    const confirmed = window.confirm(
      language === 'en'
        ? 'Clear AI Coach chat history? AI will greet you again next time.'
        : '清空 AI 陪学对话历史？AI 下次会重新打招呼。',
    );
    if (!confirmed) return;
    try {
      await api.clearStudyChat(pid);
      setMessages([]);
      // re-trigger welcome
      setWarming(true);
      const w = await api.ensureStudyWelcome(pid, language);
      setMessages(w.message ? [w.message] : []);
      setWarming(false);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Layout title="AI 陪学" back={() => nav(`/profiles/${pid}`)}>
      <div className="space-y-3">
        <Box variant="dashed" className="p-2 bg-chip-cream">
          <p className="font-cn text-xs text-ink-2">
            AI 知道你的题库情况、错题数和距考时间，会给具体的下一步建议。可以问"今天该刷什么"、"我哪一章最弱"、"再来一道关于 X"。
          </p>
        </Box>

        <Box variant="dashed" className="p-2 bg-paper min-h-[200px] max-h-[60vh] overflow-y-auto">
          {messages === null && (
            <p className="font-cn text-xs text-ink-3 text-center">加载中...</p>
          )}
          {messages && messages.length === 0 && !warming && (
            <p className="font-cn text-xs text-ink-3 text-center">还没有对话</p>
          )}
          {messages && messages.length > 0 && (
            <div className="space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="space-y-1">
                  {m.isNote ? (
                    <p className="font-cn text-[11px] text-ink-3 text-center py-1">{m.content}</p>
                  ) : (
                    <Bubble role={m.role} image={m.imageData ?? null} onImageClick={setLightbox}>
                      {m.content}
                    </Bubble>
                  )}
                  {!m.isNote && m.role === 'user' && (m.imageData || m.linkedQuestionId) && (
                    <div className="flex justify-end">
                      {m.linkedQuestionId ? (
                        <button
                          onClick={() => nav(`/profiles/${pid}/quiz?startWith=${m.linkedQuestionId}`)}
                          className="border-2 border-ink rounded-thick px-2 py-1 text-xs bg-chip-green font-cn"
                        >
                          ✓ 已入题库 · 点击查看
                        </button>
                      ) : (
                        <button
                          onClick={() => startImport(m)}
                          disabled={importingMid === m.id}
                          className="border-2 border-ink rounded-thick px-2 py-1 text-xs bg-accent-2 font-cn disabled:opacity-50"
                        >
                          {importingMid === m.id ? '🤖 识题中…' : '📚 加入题库'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {(warming || sending) && (
            <div className="mt-2">
              <Bubble role="assistant">🤖 思考中...</Bubble>
            </div>
          )}
          <div ref={bottomRef} />
        </Box>

        {error && (
          <p className="font-cn text-xs text-accent break-words">{error}</p>
        )}

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickImage(f);
          }}
        />
        <input
          ref={albumRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickImage(f);
          }}
        />

        {imageDataUrl ? (
          <Box variant="dashed" className="p-2 bg-paper">
            <div className="flex gap-2 items-start">
              <img
                src={imageDataUrl}
                alt="待发送"
                className="max-h-24 border border-ink rounded-thick"
              />
              <div className="flex-1">
                <p className="font-cn text-xs text-ink-2 mb-1">图片已选，发送时会一起带给 AI</p>
                <button
                  onClick={() => {
                    setImageDataUrl(null);
                    if (cameraRef.current) cameraRef.current.value = '';
                    if (albumRef.current) albumRef.current.value = '';
                  }}
                  className="font-cn text-[11px] text-accent underline"
                >
                  移除图片
                </button>
              </div>
            </div>
          </Box>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={sending}
              className="flex-1 border border-ink rounded-thick px-3 py-2 text-sm bg-white font-cn disabled:opacity-50"
            >
              📸 拍照提问
            </button>
            <button
              onClick={() => albumRef.current?.click()}
              disabled={sending}
              className="flex-1 border border-ink rounded-thick px-3 py-2 text-sm bg-white font-cn disabled:opacity-50"
            >
              🖼 上传截图
            </button>
          </div>
        )}

        <div className="flex gap-2 items-stretch">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={imageDataUrl ? '问图里的问题, 留空则默认 "看这张图"…' : '问 AI 陪学…'}
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send();
            }}
          />
          <Button
            variant="primary"
            onClick={send}
            disabled={(!draft.trim() && !imageDataUrl) || sending}
            className="shrink-0 self-end"
          >
            {sending ? '...' : '发送'}
          </Button>
        </div>

        {messages && messages.length > 0 && (
          <div className="text-right">
            <button
              onClick={clearAll}
              className="font-cn text-[11px] text-ink-3 underline"
            >
              清空对话（重新打招呼）
            </button>
          </div>
        )}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50"
        >
          <img src={lightbox} alt="放大查看" className="max-w-full max-h-full border-2 border-white rounded-thick" />
        </div>
      )}
    </Layout>
  );
}

function shouldRegenerateWelcome(messages: ChatMessage[], language: 'zh' | 'en') {
  if (messages.length !== 1 || messages[0].role !== 'assistant' || messages[0].isNote) return false;
  const hasChinese = /[\u3400-\u9fff]/.test(messages[0].content);
  return language === 'en' ? hasChinese : !hasChinese;
}

function Bubble({
  role,
  children,
  image,
  onImageClick,
}: {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  image?: string | null;
  onImageClick?: (src: string) => void;
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] border border-ink rounded-thick px-3 py-2 ${
          isUser ? 'bg-chip-blue' : 'bg-white'
        }`}
      >
        {image && (
          <img
            src={image}
            alt="附图"
            onClick={() => onImageClick?.(image)}
            className="max-h-40 mb-2 border border-ink rounded-thick cursor-zoom-in"
          />
        )}
        {children && (
          <p className="font-cn text-sm whitespace-pre-wrap leading-relaxed">{children}</p>
        )}
      </div>
    </div>
  );
}
