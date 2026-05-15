import { useEffect, useRef, useState } from 'react';
import { api, type ChatMessage } from '../api/client';
import { Box } from './Box';
import { Button } from './Button';
import { Textarea } from './Input';

/**
 * Question-context chat panel. Mount it anywhere a question is being
 * studied (Quiz revealed view, library detail, etc) and pass the
 * question id. Loads existing history, lets the user send more, persists
 * everything server-side.
 */
export function QuestionChat({ questionId }: { questionId: string }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await api.listChatMessages(questionId);
      setMessages(r.messages);
    } catch (e) {
      setError(String(e));
      setMessages([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  useEffect(() => {
    // auto-scroll to latest message
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await api.postChatMessage(questionId, content);
      setMessages((prev) => [...(prev ?? []), r.userMessage, r.assistantMessage]);
      setDraft('');
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  }

  async function clearAll() {
    if (!messages || messages.length === 0) return;
    if (!window.confirm('清空这道题的对话历史？')) return;
    try {
      await api.clearChatMessages(questionId);
      setMessages([]);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-cn font-bold text-xs">💬 跟 AI 聊这道题</p>
        {messages && messages.length > 0 && (
          <button
            onClick={clearAll}
            className="font-cn text-[11px] text-ink-3 underline"
          >
            清空
          </button>
        )}
      </div>

      <Box variant="dashed" className="p-2 bg-paper max-h-72 overflow-y-auto">
        {messages === null && <p className="font-cn text-xs text-ink-3">加载中...</p>}
        {messages?.length === 0 && (
          <p className="font-cn text-xs text-ink-3">
            还没聊过。问问 AI："为什么 B 错？"、"这跟产品生命周期有什么关系？"…
          </p>
        )}
        {messages && messages.length > 0 && (
          <div className="space-y-2">
            {messages.map((m) => (
              <Bubble key={m.id} role={m.role}>
                {m.content}
              </Bubble>
            ))}
            {sending && <Bubble role="assistant">🤖 思考中...</Bubble>}
            <div ref={bottomRef} />
          </div>
        )}
      </Box>

      {error && (
        <p className="font-cn text-xs text-accent break-words">{error}</p>
      )}

      <div className="flex gap-2 items-stretch">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="问 AI…"
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
    </div>
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
