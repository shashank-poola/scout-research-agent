import { useState, useEffect, useRef } from 'react';
import { sendChat, getChatHistory, getPdfUrl } from '../lib/api';
import type { ChatMessage, Session } from '../lib/types';
import styles from './ChatInterface.module.css';

interface ChatInterfaceProps {
  session: Session;
  onBack: () => void;
}

export default function ChatInterface({ session, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getChatHistory(session.id)
      .then(setMessages)
      .finally(() => setHistoryLoading(false));
  }, [session.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const reply = await sendChat(session.id, msg);
      setMessages((prev) => [...prev, reply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error getting response. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <IconArrowLeft />
        </button>
        <div className={styles.headerInfo}>
          <h2 className={styles.headerTitle}>{session.company_name}</h2>
          <span className={styles.headerSub}>AI Research Assistant</span>
        </div>
        <a
          href={getPdfUrl(session.id)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.pdfBtn}
        >
          <IconDownload />
          Download PDF
        </a>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {historyLoading ? (
          <div className={styles.emptyState}>Loading history…</div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><IconChat /></div>
            <p className={styles.emptyTitle}>Ask anything about {session.company_name}</p>
            <p className={styles.emptyDesc}>
              All answers are grounded strictly in the research report.
            </p>
            <div className={styles.starters}>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  className={styles.starterBtn}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.assistantMsg}`}
            >
              {msg.role === 'assistant' && (
                <div className={styles.assistantAvatar}>S</div>
              )}
              <div className={styles.bubble}>{msg.content}</div>
            </div>
          ))
        )}
        {loading && (
          <div className={`${styles.message} ${styles.assistantMsg}`}>
            <div className={styles.assistantAvatar}>S</div>
            <div className={`${styles.bubble} ${styles.typingBubble}`}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
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
            placeholder={`Ask about ${session.company_name}…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            <IconSend />
          </button>
        </div>
        <p className={styles.inputHint}>Answers based strictly on the research report · Enter to send</p>
      </div>
    </div>
  );
}

const STARTERS = [
  'What are the key products or services?',
  'Who are the main competitors?',
  'What is their recent financial performance?',
  'What is their go-to-market strategy?',
];

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
