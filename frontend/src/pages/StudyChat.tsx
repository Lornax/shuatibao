import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type ChatMessage } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Textarea } from '../components/Input';
import { Layout } from '../components/Layout';

/**
 * Profile-scoped AI study companion. First mount: fetch history; if empty,
 * ask the backend to generate a personalized welcome. Subsequent messages
 * go through POST /study-chat; system prompt on the server includes the
 * latest study stats so DeepSeek can give concrete next-step advice.
 */
export function StudyChat() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
            const w = await api.ensureStudyWelcome(pid);
            if (cancelled) return;
            setMessages(w.message ? [w.message] : []);
          } catch (e) {
            setError(String(e));
            setMessages([]);
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
  }, [pid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending, warming]);

  async function send() {
    const content = draft.trim();
    if (!content || sending || !pid) return;
    setSending(true);
    setError(null);
    try {
      const r = await api.postStudyChat(pid, content);
      setMessages((prev) => [...(prev ?? []), r.userMessage, r.assistantMessage]);
      setDraft('');
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  }

  async function clearAll() {
    if (!pid || !messages || messages.length === 0) return;
    if (!window.confirm('清空 AI 陪学对话历史？AI 下次会重新打招呼。')) return;
    try {
      await api.clearStudyChat(pid);
      setMessages([]);
      // re-trigger welcome
      setWarming(true);
      const w = await api.ensureStudyWelcome(pid);
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
                <Bubble key={m.id} role={m.role}>
                  {m.content}
                </Bubble>
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

        <div className="flex gap-2 items-stretch">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="问 AI 陪学…"
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send();
            }}
          />
          <Button
            variant="primary"
            onClick={send}
            disabled={!draft.trim() || sending}
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
    </Layout>
  );
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] border border-ink rounded-thick px-3 py-2 ${
          isUser ? 'bg-chip-blue' : 'bg-white'
        }`}
      >
        <p className="font-cn text-sm whitespace-pre-wrap leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
