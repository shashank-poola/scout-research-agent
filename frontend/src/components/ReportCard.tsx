import type { Session } from '../lib/types';
import styles from './ReportCard.module.css';

interface ReportCardProps {
  session: Session;
  onClick: (session: Session) => void;
}

export default function ReportCard({ session, onClick }: ReportCardProps) {
  const isLive = session.status === 'running';
  const isDone = session.status === 'done';

  return (
    <button className={styles.card} onClick={() => onClick(session)}>
      <div className={styles.thumbnail}>
        <div className={styles.thumbnailInner}>
          <ThumbnailGraphic />
        </div>
        {isLive && (
          <div className={styles.liveBadge}>
            <span className={styles.liveDot} />
            Live
          </div>
        )}
        {isDone && (
          <div className={styles.lockBadge}>
            <IconLock />
          </div>
        )}
      </div>
      <div className={styles.body}>
        <p className={styles.title}>{session.company_name} Research Report</p>
        <div className={styles.meta}>
          <div className={styles.metaLeft}>
            <span className={styles.metaAvatar}>S</span>
            <span className={styles.metaDate}>{formatDate(session.created_at)}</span>
          </div>
          <StatusDot status={session.status} />
        </div>
      </div>
    </button>
  );
}

function StatusDot({ status }: { status: string }) {
  const label: Record<string, string> = {
    pending: 'Pending',
    running: 'Running',
    done: 'Done',
    error: 'Error',
  };
  return (
    <span className={`${styles.statusDot} ${styles[`status_${status}`]}`}>
      {label[status] ?? status}
    </span>
  );
}

function ThumbnailGraphic() {
  return (
    <svg width="100%" height="80" viewBox="0 0 200 80" fill="none">
      <rect x="10" y="50" width="20" height="25" rx="3" fill="#e0d9ff" />
      <rect x="38" y="35" width="20" height="40" rx="3" fill="#c4b5fd" />
      <rect x="66" y="20" width="20" height="55" rx="3" fill="#a78bfa" />
      <rect x="94" y="30" width="20" height="45" rx="3" fill="#c4b5fd" />
      <rect x="122" y="10" width="20" height="65" rx="3" fill="#7c3aed" />
      <rect x="150" y="40" width="20" height="35" rx="3" fill="#a78bfa" />
      <polyline
        points="20,45 48,30 76,15 104,25 132,8 160,35"
        stroke="#6c5ce7"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
