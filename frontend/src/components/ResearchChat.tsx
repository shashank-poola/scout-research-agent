import { useState, useEffect, useRef, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Sent02Icon,
  Mic01Icon,
  Download01Icon,
  CheckmarkCircle01Icon,
  Pdf01Icon,
} from '@hugeicons/core-free-icons';
import { createSession, runWorkflow, streamProgress, sendChat, getChatHistory, getPdfUrl } from '../routes';
import type { Session, ProgressEvent } from '../lib/types';
import styles from './ResearchChat.module.css';

// ── Types ────────────────────────────────────────────────────────────────────
type MsgRole = 'user' | 'ai';
type MsgKind = 'text' | 'progress' | 'complete' | 'error';

interface Msg {
  id: string;
  role: MsgRole;
  kind: MsgKind;
  content: string;
  node?: string;
}

// ── Node labels ───────────────────────────────────────────────────────────────
const NODE_LABELS: Record<string, string> = {
  planner: '📋 Planning search queries…',
  researcher: '🔍 Researching across the web with Exa…',
  analyzer: '🧠 Analyzing and synthesizing findings…',
  quality_check: '✅ Running quality check…',
  generate_report: '📄 Generating PDF report…',
  done: '🎉 Research complete!',
  error: '❌ An error occurred during research.',
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface ResearchChatProps {
  initialQuery: string;
  existingSession?: Session;
  onBack: () => void;
  onSidebarCollapse: () => void;
}

let msgCounter = 0;
const uid = () => `msg-${++msgCounter}`;

export default function ResearchChat({
  initialQuery,
  existingSession,
  onBack,
  onSidebarCollapse,
}: ResearchChatProps) {
  const [session, setSession] = useState<Session | null>(existingSession ?? null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'research' | 'chat'>(
    existingSession?.status === 'done' ? 'chat' : 'research',
  );
  const [pdfReady, setPdfReady] = useState(existingSession?.status === 'done');
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sidebarCollapsed = useRef(false);

  const push = useCallback((msg: Omit<Msg, 'id'>) => {
    setMessages((prev) => [...prev, { id: uid(), ...msg }]);
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Start research or restore existing session ────────────────────────────
  useEffect(() => {
    if (existingSession?.status === 'done') {
      // Restore chat history for a completed session
      push({ role: 'user', kind: 'text', content: initialQuery });
      push({ role: 'ai', kind: 'complete', content: `Research on **${existingSession.company_name}** is complete. Ask me anything about the report.` });
      getChatHistory(existingSession.id).then((history) => {
        history.forEach((m) => push({ role: m.role === 'user' ? 'user' : 'ai', kind: 'text', content: m.content }));
      });
      if (!sidebarCollapsed.current) {
        sidebarCollapsed.current = true;
        onSidebarCollapse();
      }
      return;
    }

    if (existingSession?.status === 'running') {
      setSession(existingSession);
      push({ role: 'user', kind: 'text', content: initialQuery });
      push({ role: 'ai', kind: 'progress', content: 'Research is already in progress…' });
      attachStream(existingSession.id);
      return;
    }

    // Brand-new research
    push({ role: 'user', kind: 'text', content: initialQuery });
    push({ role: 'ai', kind: 'progress', content: `Starting research on **${initialQuery}**. I'll search the web, analyze findings, and generate a comprehensive report.` });

    (async () => {
      try {
        const s = await createSession({
          company_name: initialQuery,
          website: '',
          research_objective: `Comprehensive research report on ${initialQuery}`,
        });
        setSession(s);
        await runWorkflow(s.id);
        attachStream(s.id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        push({ role: 'ai', kind: 'error', content: `Failed to start research: ${message}` });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function attachStream(sessionId: number) {
    const stop = streamProgress(sessionId, (evt: ProgressEvent) => {
      if (evt.ping) return;
      if (evt.done) {
        handleResearchDone(sessionId, evt);
        stop();
        return;
      }
      const label = NODE_LABELS[evt.node] ?? `${evt.node}…`;
      push({ role: 'ai', kind: 'progress', content: label, node: evt.node });
    });
  }

  function handleResearchDone(sessionId: number, _evt: ProgressEvent) {
    push({
      role: 'ai',
      kind: 'complete',
      content: '✅ Research complete! I\'ve generated your PDF report. Ask me anything about the findings.',
    });
    setPdfReady(true);
    setPhase('chat');
    if (!sidebarCollapsed.current) {
      sidebarCollapsed.current = true;
      onSidebarCollapse();
    }
    setSession((prev) => prev ? { ...prev, id: sessionId, status: 'done' } : prev);
  }

  // ── Chat Q&A ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || chatLoading || !session) return;
    setInput('');
    push({ role: 'user', kind: 'text', content: msg });
    setChatLoading(true);
    try {
      const reply = await sendChat(session.id, msg);
      push({ role: 'ai', kind: 'text', content: reply.content });
    } catch {
      push({ role: 'ai', kind: 'error', content: 'Error getting response. Please try again.' });
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const pdfUrl = session ? getPdfUrl(session.id) : null;

  return (
    <div className={`${styles.root} ${pdfReady ? styles.withPdf : ''}`}>
      {/* ── Left: Chat panel ────────────────────────────────────────────── */}
      <div className={styles.chatPanel}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} color="currentColor" strokeWidth={1.8} />
          </button>
          <div className={styles.headerInfo}>
            <h2 className={styles.headerTitle}>{session?.company_name ?? initialQuery}</h2>
            <span className={styles.headerSub}>
              {phase === 'research' ? 'Researching…' : 'AI Research Assistant'}
            </span>
          </div>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={styles.pdfBtn}>
              <HugeiconsIcon icon={Download01Icon} size={14} color="currentColor" strokeWidth={1.8} />
              PDF
            </a>
          )}
        </div>

        {/* Messages */}
        <div className={styles.messages}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {chatLoading && (
            <div className={styles.aiRow}>
              <AiAvatar />
              <div className={`${styles.bubble} ${styles.aiBubble} ${styles.typingBubble}`}>
                <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className={styles.inputArea}>
          <div className={styles.inputBox}>
            <textarea
              ref={inputRef}
              className={styles.textarea}
              placeholder={phase === 'research' ? 'Research in progress…' : `Ask about ${session?.company_name ?? initialQuery}…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={phase === 'research'}
            />
            <button className={styles.micBtn} type="button" tabIndex={-1}>
              <HugeiconsIcon icon={Mic01Icon} size={15} color="currentColor" strokeWidth={1.8} />
            </button>
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!input.trim() || chatLoading || phase === 'research'}
            >
              <HugeiconsIcon icon={Sent02Icon} size={15} color="currentColor" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: PDF viewer ────────────────────────────────────────────── */}
      {pdfReady && pdfUrl && (
        <div className={styles.pdfPanel}>
          <div className={styles.pdfHeader}>
            <HugeiconsIcon icon={Pdf01Icon} size={16} color="currentColor" strokeWidth={1.8} />
            <span>{session?.company_name} Research Report</span>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={styles.pdfOpenBtn}>
              <HugeiconsIcon icon={Download01Icon} size={13} color="currentColor" strokeWidth={1.8} />
              Download
            </a>
          </div>
          <iframe
            src={pdfUrl}
            className={styles.pdfFrame}
            title={`${session?.company_name} Research Report PDF`}
          />
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AiAvatar() {
  return <div className={styles.aiAvatar}>S</div>;
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === 'user') {
    return (
      <div className={styles.userRow}>
        <div className={`${styles.bubble} ${styles.userBubble}`}>
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.kind === 'progress') {
    return (
      <div className={styles.progressRow}>
        <span className={styles.progressDot} />
        <span className={styles.progressText}>{msg.content}</span>
      </div>
    );
  }

  if (msg.kind === 'complete') {
    return (
      <div className={styles.aiRow}>
        <AiAvatar />
        <div className={`${styles.bubble} ${styles.aiBubble} ${styles.completeBubble}`}>
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color="#16a34a" strokeWidth={1.8} />
          <span>{msg.content}</span>
        </div>
      </div>
    );
  }

  if (msg.kind === 'error') {
    return (
      <div className={styles.aiRow}>
        <AiAvatar />
        <div className={`${styles.bubble} ${styles.aiBubble} ${styles.errorBubble}`}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.aiRow}>
      <AiAvatar />
      <div className={`${styles.bubble} ${styles.aiBubble}`}>{msg.content}</div>
    </div>
  );
}
