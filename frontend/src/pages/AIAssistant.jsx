import { useEffect, useRef, useState } from 'react';
import { MessagesSquare, Send, Sparkles, RotateCcw } from 'lucide-react';

import ChatMessage from '../components/chat/ChatMessage.jsx';
import LevelSwitcher from '../components/chat/LevelSwitcher.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PhasePlaceholder from '../components/loading/PhasePlaceholder.jsx';
import AIReadinessBanner from '../components/panels/AIReadinessBanner.jsx';
import { useChat } from '../hooks/useChat.js';

const SUGGESTED = [
  'Explain this repository',
  'How does authentication work?',
  'Where are the API routes defined?',
  'Show me the payment flow',
  'What are the main data models?',
  'Suggest improvements',
];

export default function AIAssistant() {
  const { messages, pending, send, reset, hasRepo } = useChat();
  const [level, setLevel] = useState('intermediate');
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  if (!hasRepo) {
    return (
      <PhasePlaceholder
        icon={MessagesSquare}
        title="AI Code Assistant"
        subtitle="Ask questions about the codebase in natural language. Analyze a repository first."
      />
    );
  }

  const onSend = () => {
    const q = input.trim();
    if (!q || pending) return;
    setInput('');
    send(q, level);
  };

  return (
    <div className="h-full flex flex-col p-8 max-w-[1100px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles size={22} className="text-[color:var(--accent-purple)]" />
            AI Code Assistant
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Ask about anything in the codebase — architecture, individual files, patterns. Answers cite the files they draw from.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LevelSwitcher value={level} onChange={setLevel} />
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw size={14} />
              Reset
            </Button>
          )}
        </div>
      </div>

      <AIReadinessBanner />

      {/* Suggested prompts (only when empty) */}
      {messages.length === 0 && (
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold mb-3">
            Try one of these
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => send(s, level)}
                className="text-sm h-8 px-3 rounded-md bg-surface-elevated hairline text-ink-secondary
                           hover:text-ink-primary hover:bg-surface-hover transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation */}
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-6"
      >
        {messages.map((m, i) => (
          <ChatMessage key={i} msg={m} />
        ))}

        {pending && (
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            <div className="h-8 w-8 rounded-md grid place-items-center bg-[color:var(--accent-purple)]/15 text-[color:var(--accent-purple)]">
              <Sparkles size={15} className="animate-pulse" />
            </div>
            <span>Thinking…</span>
          </div>
        )}
      </div>

      {/* Composer */}
      <Card className="mt-6 !p-2 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask something about this codebase…"
          className="flex-1 bg-transparent outline-none px-3 text-sm text-ink-primary placeholder:text-ink-muted"
        />
        <Button variant="primary" onClick={onSend} disabled={!input.trim() || pending} size="md">
          <Send size={14} />
          Send
        </Button>
      </Card>
    </div>
  );
}
