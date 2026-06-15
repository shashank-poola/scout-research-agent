import { useState, useEffect, useRef, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUp01Icon,
  Mic01Icon,
  Download01Icon,
  CheckmarkCircle01Icon,
  Pdf01Icon,
  Home01Icon,
} from '@hugeicons/core-free-icons';
import { createSession, runWorkflow, streamProgress, sendChat, getChatHistory, getPdfUrl, getDownloadUrl } from '../../routes';
import type { Session, ProgressEvent } from '../../lib/types';
import logoScout from '../../assets/logoscout.png';
import styles from './ResearchChat.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────
type MsgRole = 'user' | 'ai';
type MsgKind = 'text' | 'progress' | 'complete' | 'error';

interface Msg {
  id: string;
  role: MsgRole;
  kind: MsgKind;
  content: string;
}

// ── Node labels ────────────────────────────────────────────────────────────────
const NODE_LABELS: Record<string, string> = {
  planner: '📋 Planning search queries…',
  researcher: '🔍 Researching across the web with Exa…',
  analyzer: '🧠 Analyzing and synthesizing findings…',
  quality_check: '✅ Running quality check…',
  generate_report: '📄 Generating PDF report…',
  done: '🎉 Research complete!',
  error: '❌ An error occurred.',
};

// ── Props ──────────────────────────────────────────────────────────────────────
interface ResearchChatProps {
  initialQuery: string;
  existingSession?: Session;
  onBack: () => void;
  onSidebarCollapse: () => void;
}

let msgCounter = 0;
const uid = () => `msg-${++msgCounter}`;

function stripBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

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
  const initiated = useRef(false);
  const sidebarCollapsed = useRef(false);

  const push = useCallback((msg: Omit<Msg, 'id'>) => {
    setMessages((prev) => [...prev, { id: uid(), ...msg }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Init (runs once) ───────────────────────────────────────────────────────
  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;

    if (existingSession?.status === 'done') {
      push({ role: 'user', kind: 'text', content: initialQuery });
      push({ role: 'ai', kind: 'complete', content: `Research on ${existingSession.company_name} is complete. Ask me anything about the report.` });
      getChatHistory(existingSession.id).then((history) =>
        history.forEach((m) =>
          push({ role: m.role === 'user' ? 'user' : 'ai', kind: 'text', content: m.content }),
        ),
      );
      collapseSidebar();
      return;
    }

    if (existingSession?.status === 'running') {
      push({ role: 'user', kind: 'text', content: initialQuery });
      push({ role: 'ai', kind: 'progress', content: 'Research is already in progress…' });
      attachStream(existingSession.id);
      return;
    }

    // New research
    push({ role: 'user', kind: 'text', content: initialQuery });
    push({
      role: 'ai',
      kind: 'progress',
      content: `Starting research on "${initialQuery}". I'll search the web, analyze findings, and generate a comprehensive report.`,
    });

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
        handleDone(sessionId);
        stop();
        return;
      }
      const label = NODE_LABELS[evt.node] ?? `${evt.node}…`;
      push({ role: 'ai', kind: 'progress', content: label });
    });
  }

  function handleDone(sessionId: number) {
    push({ role: 'ai', kind: 'complete', content: 'Research complete! PDF report is ready. Ask me anything about the findings.' });
    setPdfReady(true);
    setPhase('chat');
    setSession((prev) => (prev ? { ...prev, id: sessionId, status: 'done' } : prev));
    collapseSidebar();
  }

  function collapseSidebar() {
    if (!sidebarCollapsed.current) {
      sidebarCollapsed.current = true;
      onSidebarCollapse();
    }
  }

  // ── Chat Q&A ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || chatLoading || !session) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
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
  const downloadUrl = session ? getDownloadUrl(session.id) : null;
  const displayName = session?.company_name ?? initialQuery;

  // Short title for the PDF panel header — one line only
  const pdfPanelTitle = (() => {
    const name = displayName;
    if (name.includes('—')) {
      return name.split('—')[0].replace(/^Research\s+(on\s+)?/i, '').trim();
    }
    return name.length > 50 ? name.slice(0, 50) + '…' : name;
  })();

  return (
    <div className={`${styles.root} ${pdfReady ? styles.withPdf : ''}`}>
      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      <div className={styles.chatPanel}>
        <div className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.headerInfo}>
              <h2 className={styles.headerTitle}>{displayName}</h2>
              <span className={styles.headerSub}>
                {phase === 'research' ? 'Researching…' : 'AI Research Assistant'}
              </span>
            </div>
            {downloadUrl && (
              <a href={downloadUrl} className={styles.pdfBtn}>
                <HugeiconsIcon icon={Download01Icon} size={13} color="currentColor" strokeWidth={1.8} />
                Download
              </a>
            )}
          </div>
        </div>

        <div className={styles.messages}>
          <div className={styles.messagesInner}>
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
        </div>

        <div className={styles.inputArea}>
          <div className={styles.inputInner}>
            <div className={styles.inputBox}>
              <textarea
                ref={inputRef}
                className={styles.textarea}
                placeholder={phase === 'research' ? 'Research in progress…' : `Ask about ${pdfPanelTitle}…`}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
                }}
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
                <HugeiconsIcon icon={ArrowUp01Icon} size={15} color="currentColor" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── PDF panel ───────────────────────────────────────────────────── */}
      {pdfReady && pdfUrl && (
        <div className={styles.pdfPanel}>
          <div className={styles.pdfHeader}>
            <HugeiconsIcon icon={Pdf01Icon} size={14} color="currentColor" strokeWidth={1.8} />
            <span className={styles.pdfHeaderTitle}>{pdfPanelTitle} — Research Report</span>
            <div className={styles.pdfHeaderActions}>
              <a href={downloadUrl ?? '#'} className={styles.pdfOpenBtn}>
                <HugeiconsIcon icon={Download01Icon} size={13} color="currentColor" strokeWidth={1.8} />
                Download
              </a>
              <button className={styles.pdfOpenBtn} onClick={onBack}>
                <HugeiconsIcon icon={Home01Icon} size={13} color="currentColor" strokeWidth={1.8} />
                Dashboard
              </button>
            </div>
          </div>
          <iframe src={pdfUrl} className={styles.pdfFrame} title={`${displayName} Research Report`} />
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AiAvatar() {
  return <img src={logoScout} className={styles.aiAvatar} alt="Scout AI" />;
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === 'user') {
    return (
      <div className={styles.userRow}>
        <div className={`${styles.bubble} ${styles.userBubble}`}>
          {stripBold(msg.content)}
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
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} color="#16a34a" strokeWidth={1.8} />
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
      <div className={`${styles.bubble} ${styles.aiBubble}`}>
        {renderMarkdown(msg.content)}
      </div>
    </div>
  );
}
