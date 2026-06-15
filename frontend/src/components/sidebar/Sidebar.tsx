import { useState } from 'react';
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
import styles from './Sidebar.module.css';

interface NavItemProps {
  icon: HIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

function NavItem({ icon, label, onClick, active }: NavItemProps) {
  return (
    <button
      className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
      onClick={onClick}
    >
      <span className={styles.navIcon}>
        <HugeiconsIcon icon={icon} size={16} color="currentColor" strokeWidth={1.8} />
      </span>
      <span className={styles.navLabel}>{label}</span>
    </button>
  );
}

interface SidebarProps {
  activeView: string;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  onNavigate: (view: string) => void;
  onNewResearch: () => void;
}

export default function Sidebar({
  activeView,
  collapsed,
  onCollapse,
  onNavigate,
  onNewResearch,
}: SidebarProps) {
  const [showProfile, setShowProfile] = useState(false);

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
          />
          <NavItem
            icon={Search01Icon}
            label="Search"
            onClick={() => onNavigate('search')}
            active={activeView === 'search'}
          />
          <NavItem
            icon={BookOpen01Icon}
            label="Reports"
            onClick={() => onNavigate('home')}
            active={activeView === 'home'}
          />
          <NavItem
            icon={Clock01Icon}
            label="History"
            onClick={() => onNavigate('history')}
            active={activeView === 'history'}
          />
        </nav>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Research</span>
          </div>
          <div className={styles.sectionLinks}>
            <button className={styles.sectionLink}>Recent</button>
            <button className={styles.sectionLink}>Starred</button>
            <button className={styles.sectionLink}>Completed</button>
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
