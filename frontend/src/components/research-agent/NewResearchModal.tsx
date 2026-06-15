import { useState, useRef, useEffect } from 'react';
import styles from './NewResearchModal.module.css';
import type { CreateSessionPayload } from '../../lib/types';

interface NewResearchModalProps {
  initialQuery?: string;
  onSubmit: (payload: CreateSessionPayload) => void;
  onClose: () => void;
}

export default function NewResearchModal({ initialQuery = '', onSubmit, onClose }: NewResearchModalProps) {
  const [companyName, setCompanyName] = useState(initialQuery);
  const [website, setWebsite] = useState('');
  const [objective, setObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setLoading(true);
    await onSubmit({
      company_name: companyName.trim(),
      website: website.trim(),
      research_objective: objective.trim() || `Comprehensive research report on ${companyName.trim()}`,
    });
    setLoading(false);
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>New Research</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Company Name *</label>
            <input
              ref={firstRef}
              className={styles.input}
              type="text"
              placeholder="e.g. OpenAI"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Website</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. openai.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Research Objective</label>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Understand their AI product strategy, recent funding, and competitive positioning"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.suggestions}>
            <span className={styles.suggestLabel}>Quick objectives:</span>
            {QUICK_OBJECTIVES.map((q) => (
              <button
                key={q}
                type="button"
                className={styles.suggestChip}
                onClick={() => setObjective(q)}
              >
                {q}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !companyName.trim()}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <IconRocket />
                Start Research
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const QUICK_OBJECTIVES = [
  'Market position & competitive analysis',
  'Recent funding & financial health',
  'Product strategy & roadmap',
  'Leadership team & culture',
];

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconRocket() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}
