import { useState, useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Add01Icon,
  BookOpen01Icon,
  Clock01Icon,
  GridViewIcon,
} from '@hugeicons/core-free-icons';
import type { HugeiconsIconProps } from '@hugeicons/react';
import type { Session } from '../../lib/types';
import styles from './CommandPalette.module.css';

type HIcon = HugeiconsIconProps['icon'];

interface NavCommand {
  label: string;
  shortcut: string;
  icon: HIcon;
  action: 'new' | 'home';
}

const NAV_COMMANDS: NavCommand[] = [
  { label: 'New Research', shortcut: 'N', icon: Add01Icon, action: 'new' },
  { label: 'Reports', shortcut: 'R', icon: BookOpen01Icon, action: 'home' },
  { label: 'History', shortcut: 'H', icon: Clock01Icon, action: 'home' },
  { label: 'Dashboard', shortcut: 'D', icon: GridViewIcon, action: 'home' },
];

interface CommandPaletteProps {
  sessions: Session[];
  onClose: () => void;
  onNewResearch: () => void;
  onNavigate: (dest: string) => void;
  onOpenSession: (session: Session) => void;
}

export default function CommandPalette({
  sessions,
  onClose,
  onNewResearch,
  onNavigate,
  onOpenSession,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const q = query.toLowerCase();

  const filteredSessions = sessions
    .filter((s) => !q || s.company_name.toLowerCase().includes(q))
    .slice(0, 5);

  const filteredCommands = NAV_COMMANDS.filter(
    (cmd) => !q || cmd.label.toLowerCase().includes(q),
  );

  const hasResults = filteredSessions.length > 0 || filteredCommands.length > 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchRow}>
          <span className={styles.searchIcon}>
            <HugeiconsIcon icon={Search01Icon} size={16} color="currentColor" strokeWidth={1.8} />
          </span>
          <input
            ref={inputRef}
            className={styles.searchInput}
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className={styles.escKey}>esc</kbd>
        </div>

        <div className={styles.body}>
          {filteredSessions.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupLabel}>Recent</div>
              {filteredSessions.map((s) => (
                <button
                  key={s.id}
                  className={styles.item}
                  onClick={() => { onOpenSession(s); onClose(); }}
                >
                  <span className={styles.itemIcon}>
                    <HugeiconsIcon icon={Clock01Icon} size={14} color="currentColor" strokeWidth={1.6} />
                  </span>
                  <span className={styles.itemLabel}>{s.company_name}</span>
                  <span className={`${styles.badge} ${s.status === 'done' ? styles.badgeDone : s.status === 'running' ? styles.badgeRunning : ''}`}>
                    {s.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredCommands.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupLabel}>Navigation</div>
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.label}
                  className={styles.item}
                  onClick={() => {
                    if (cmd.action === 'new') onNewResearch();
                    else onNavigate(cmd.action);
                    onClose();
                  }}
                >
                  <span className={styles.itemIcon}>
                    <HugeiconsIcon icon={cmd.icon} size={14} color="currentColor" strokeWidth={1.6} />
                  </span>
                  <span className={styles.itemLabel}>{cmd.label}</span>
                  <kbd className={styles.kbd}>{cmd.shortcut}</kbd>
                </button>
              ))}
            </div>
          )}

          {!hasResults && (
            <div className={styles.empty}>No results for "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
