import { useState, useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Mic01Icon,
  Sent02Icon,
  SparklesIcon,
  ChevronDownIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { listSessions } from '../routes';
import type { Session } from '../lib/types';
import ReportCard from './ReportCard';
import styles from './Dashboard.module.css';

interface DashboardProps {
  onStartResearch: (query: string) => void;
  onOpenSession: (session: Session) => void;
  refreshKey: number;
}

const SUGGESTIONS = [
  "Research OpenAI's competitive landscape",
  "Analyze Stripe's payment strategy",
  "Deep dive into Nvidia's AI chip market",
  "Understand Anthropic's research focus",
];

export default function Dashboard({ onStartResearch, onOpenSession, refreshKey }: DashboardProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listSessions().then(setSessions).catch(() => {});
  }, [refreshKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    onStartResearch(q);
  };

  const visible = showAll ? sessions : sessions.slice(0, 3);

  return (
    <div className={styles.page}>
      <div className={styles.heroBg} aria-hidden>
        <div className={styles.heroShape1} />
        <div className={styles.heroShape2} />
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>What do you want to research?</h1>

        {/* Main input card */}
        <form className={styles.inputCard} onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Enter a company name, website, or research topic…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className={styles.inputBar}>
            <button type="button" className={styles.modelChip}>
              <HugeiconsIcon icon={SparklesIcon} size={13} color="currentColor" strokeWidth={1.8} />
              <span>Groq · Llama 3.3 70B</span>
              <HugeiconsIcon icon={ChevronDownIcon} size={11} color="currentColor" strokeWidth={2} />
            </button>
            <div className={styles.inputActions}>
              <button type="button" className={styles.actionBtn} title="Attach">
                <HugeiconsIcon icon={Add01Icon} size={16} color="currentColor" strokeWidth={1.8} />
              </button>
              <button type="button" className={styles.actionBtn} title="Voice">
                <HugeiconsIcon icon={Mic01Icon} size={16} color="currentColor" strokeWidth={1.8} />
              </button>
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!query.trim()}
                title="Start research"
              >
                <HugeiconsIcon icon={Sent02Icon} size={15} color="currentColor" strokeWidth={2} />
              </button>
            </div>
          </div>
        </form>

        {/* Suggestions */}
        <div className={styles.suggestions}>
          <p className={styles.suggestTitle}>Suggested ideas based on your research history</p>
          <div className={styles.suggestList}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className={styles.suggestItem}
                onClick={() => { setQuery(s); inputRef.current?.focus(); }}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={12} color="currentColor" strokeWidth={2} />
                <span>{s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Latest reports */}
        {sessions.length > 0 && (
          <div className={styles.reports}>
            <h2 className={styles.reportsTitle}>Latest reports</h2>
            <div className={styles.reportGrid}>
              {visible.map((s) => (
                <ReportCard key={s.id} session={s} onClick={onOpenSession} />
              ))}
            </div>
            {sessions.length > 3 && (
              <button
                className={styles.showMoreBtn}
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? '− Show less' : `+ Show more (${sessions.length - 3})`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
