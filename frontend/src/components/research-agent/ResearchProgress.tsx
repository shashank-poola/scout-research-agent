import { useEffect, useState } from 'react';
import { streamProgress } from '../../lib/api';
import type { ProgressEvent, Session } from '../../lib/types';
import styles from './ResearchProgress.module.css';

const NODES: Record<string, { label: string; description: string }> = {
  planner: { label: 'Planning', description: 'Generating research queries' },
  researcher: { label: 'Researching', description: 'Searching the web via Exa' },
  analyzer: { label: 'Analyzing', description: 'Synthesizing findings' },
  quality_check: { label: 'Quality Check', description: 'Evaluating research depth' },
  generate_report: { label: 'Generating Report', description: 'Creating PDF report' },
  done: { label: 'Complete', description: 'Research finished' },
  error: { label: 'Error', description: 'Something went wrong' },
};

interface ResearchProgressProps {
  session: Session;
  onComplete: (sessionId: number) => void;
}

export default function ResearchProgress({ session, onComplete }: ResearchProgressProps) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const stop = streamProgress(session.id, (evt) => {
      if (evt.ping) return;
      setEvents((prev) => [...prev, evt]);
      if (evt.done) {
        setIsDone(true);
        setTimeout(() => onComplete(session.id), 1800);
      }
    });
    return stop;
  }, [session.id, onComplete]);

  const completedNodes = events.filter((e) => !e.ping).map((e) => e.node);
  const currentNode = completedNodes[completedNodes.length - 1];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.companyInfo}>
          <h1 className={styles.companyName}>{session.company_name}</h1>
          <p className={styles.website}>{session.website}</p>
        </div>
        {isDone ? (
          <div className={styles.doneChip}>
            <IconCheck /> Research Complete
          </div>
        ) : (
          <div className={styles.runningChip}>
            <span className={styles.runningDot} />
            Running
          </div>
        )}
      </div>

      <div className={styles.objective}>
        <span className={styles.objectiveLabel}>Objective</span>
        <p className={styles.objectiveText}>{session.research_objective}</p>
      </div>

      <div className={styles.pipeline}>
        {Object.entries(NODES).slice(0, 5).map(([key, info]) => {
          const isComplete = completedNodes.includes(key);
          const isCurrent = currentNode === key && !isDone;
          return (
            <div
              key={key}
              className={`${styles.step} ${isComplete ? styles.stepDone : ''} ${isCurrent ? styles.stepActive : ''}`}
            >
              <div className={styles.stepIcon}>
                {isComplete ? <IconCheck /> : isCurrent ? <span className={styles.stepSpinner} /> : <span className={styles.stepDot} />}
              </div>
              <div className={styles.stepInfo}>
                <span className={styles.stepLabel}>{info.label}</span>
                <span className={styles.stepDesc}>{info.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      {!isDone && (
        <div className={styles.log}>
          {events.slice().reverse().map((evt, i) => (
            <div key={i} className={styles.logItem}>
              <span className={styles.logNode}>{NODES[evt.node]?.label ?? evt.node}</span>
              <span className={styles.logStatus}>{evt.status}</span>
              {evt.quality_score != null && (
                <span className={styles.logScore}>Score: {(evt.quality_score * 100).toFixed(0)}%</span>
              )}
            </div>
          ))}
        </div>
      )}

      {isDone && (
        <div className={styles.completeMsg}>
          <IconRocket /> Report ready — opening now…
        </div>
      )}
    </div>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconRocket() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    </svg>
  );
}
