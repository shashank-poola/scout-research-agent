import { useState, useEffect } from 'react';
import { HugeiconsIcon, type HugeiconsIconProps } from '@hugeicons/react';

type HIcon = HugeiconsIconProps['icon'];
import {
  Add01Icon,
  Search01Icon,
  BookOpen01Icon,
  Clock01Icon,
  GridViewIcon,
  SidebarLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import logoScout from '../../assets/logoscout.png';
import ProfileMenu from '../profile/ProfileMenu';
import { listSessions } from '../../routes/sessions';
import type { Session } from '../../lib/types';
import styles from './Sidebar.module.css';

interface NavItemProps {
  icon: HIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
  shortcut?: string;
}

function NavItem({ icon, label, onClick, active, shortcut }: NavItemProps) {
  return (
    <button
      className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
      onClick={onClick}
    >
      <span className={styles.navIcon}>
        <HugeiconsIcon icon={icon} size={16} color="currentColor" strokeWidth={1.8} />
      </span>
      <span className={styles.navLabel}>{label}</span>
      {shortcut && <kbd className={styles.shortcutKey}>{shortcut}</kbd>}
    </button>
  );
}

type ResearchFilter = 'recent' | 'completed';

interface SidebarProps {
  activeView: string;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  onNavigate: (view: string) => void;
  onNewResearch: () => void;
  onOpenSession: (session: Session) => void;
  onSearchOpen: () => void;
  sessions: Session[];
}

export default function Sidebar({
  activeView,
  collapsed,
  onCollapse,
  onNavigate,
  onNewResearch,
  onOpenSession,
  onSearchOpen,
  sessions,
}: SidebarProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [researchFilter, setResearchFilter] = useState<ResearchFilter>('recent');

  const sorted = sessions.slice().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const displayedSessions =
    researchFilter === 'completed'
      ? sorted.filter((s) => s.status === 'done').slice(0, 6)
      : sorted.slice(0, 6);

  if (collapsed) {
    return (
      <aside className={`${styles.sidebar} ${styles.collapsed}`}>
        <button
          className={styles.collapseBtn}
          onClick={() => onCollapse(false)}
          title="Expand sidebar"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.top}>
        <div className={styles.logoRow}>
          <img src={logoScout} alt="Scout AI" className={styles.logo} />
          <button
            className={styles.collapseBtn}
            onClick={() => onCollapse(true)}
            title="Collapse sidebar"
          >
            <HugeiconsIcon icon={SidebarLeft01Icon} size={16} color="currentColor" strokeWidth={1.8} />
          </button>
        </div>

        <nav className={styles.nav}>
          <NavItem
            icon={Add01Icon}
            label="New Research"
            onClick={onNewResearch}
            shortcut="N"
          />
          <NavItem
            icon={Search01Icon}
            label="Search"
            onClick={onSearchOpen}
            active={activeView === 'search'}
            shortcut="⌘K"
          />
          <NavItem
            icon={BookOpen01Icon}
            label="Reports"
            onClick={() => onNavigate('home')}
            active={activeView === 'home'}
            shortcut="R"
          />
          <NavItem
            icon={Clock01Icon}
            label="History"
            onClick={() => onNavigate('history')}
            active={activeView === 'history'}
            shortcut="H"
          />
        </nav>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Research</span>
          </div>

          <div className={styles.filterRow}>
            <button
              className={`${styles.filterBtn} ${researchFilter === 'recent' ? styles.filterBtnActive : ''}`}
              onClick={() => setResearchFilter('recent')}
            >
              Recent
            </button>
            <button
              className={`${styles.filterBtn} ${researchFilter === 'completed' ? styles.filterBtnActive : ''}`}
              onClick={() => setResearchFilter('completed')}
            >
              Completed
            </button>
          </div>

          <div className={styles.sessionList}>
            {displayedSessions.length === 0 ? (
              <p className={styles.emptyNote}>No research yet</p>
            ) : (
              displayedSessions.map((s) => (
                <button
                  key={s.id}
                  className={styles.sessionItem}
                  onClick={() => onOpenSession(s)}
                  title={s.company_name}
                >
                  <span
                    className={`${styles.sessionDot} ${
                      s.status === 'done'
                        ? styles.sessionDotDone
                        : s.status === 'running'
                        ? styles.sessionDotRunning
                        : ''
                    }`}
                  />
                  <span className={styles.sessionName}>{s.company_name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.bottomArea}>
        {showProfile && <ProfileMenu onClose={() => setShowProfile(false)} />}
        <button
          className={styles.userRow}
          onClick={() => setShowProfile((v) => !v)}
        >
          <div className={styles.avatar}>SP</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>P. Shashank</span>
            <span className={styles.userEmail}>shashankpoola123@g…</span>
          </div>
          <HugeiconsIcon icon={GridViewIcon} size={15} color="currentColor" strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}
