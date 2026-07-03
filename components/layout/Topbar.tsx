'use client';
import { MdPerson, MdArrowDropDown, MdMenu, MdLogout } from 'react-icons/md';
import { useGetUserDetailQuery } from '@/store/services/drugApi';
import { toast } from 'react-toastify';
import { useState } from 'react';
import styles from './Topbar.module.css';

interface TopbarProps {
  onMenuToggle?: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { data: user } = useGetUserDetailQuery();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    toast.info('Logged out');
    window.location.href = '/auth/login';
  };

  return (
    <header className={styles.topbar}>
      <button className={styles.menuBtn} onClick={onMenuToggle} aria-label="Toggle menu">
        <MdMenu />
      </button>

      <div className={styles.user} onClick={() => setShowMenu(!showMenu)}>
        <MdPerson className={styles.userIcon} />
        <span className={styles.userName}>{user?.firstName || 'User'}</span>
        <MdArrowDropDown className={styles.arrow} />
        {showMenu && (
          <div className={styles.userMenu}>
            <button className={styles.menuItem} onClick={handleLogout}>
              <MdLogout /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
