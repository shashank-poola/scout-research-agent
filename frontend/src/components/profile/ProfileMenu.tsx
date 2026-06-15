import { useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, Logout01Icon } from '@hugeicons/core-free-icons';
import styles from './ProfileMenu.module.css';

interface ProfileMenuProps {
  onClose: () => void;
}

const USER = {
  name: 'P. Shashank',
  email: 'shashankpoola123@gmail.com',
  initials: 'SP',
};

export default function ProfileMenu({ onClose }: ProfileMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className={styles.menu}>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>{USER.initials}</div>
        <div className={styles.profileInfo}>
          <span className={styles.profileName}>{USER.name}</span>
          <span className={styles.profileEmail}>{truncateEmail(USER.email)}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <button className={styles.menuItem}>
        <HugeiconsIcon icon={Mail01Icon} size={16} color="currentColor" strokeWidth={1.5} />
        Contact us
      </button>

      <div className={styles.divider} />

      <button className={styles.menuItem} onClick={onClose}>
        <HugeiconsIcon icon={Logout01Icon} size={16} color="currentColor" strokeWidth={1.5} />
        Logout
      </button>
    </div>
  );
}

function truncateEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 12) return email;
  return `${local.slice(0, 12)}…@${domain}`;
}
