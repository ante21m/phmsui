'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useLoginMutation } from '@/store/services/drugApi';
import { TextField } from '@/components';
import styles from './Login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [login] = useLoginMutation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) { toast.error('Please enter username and password'); return; }
    setLoading(true);
    try {
      const tokens = await login({ username, password }).unwrap();
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      toast.success('Login successful');
      router.push('/dashboard');
    } catch {
      toast.error('Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoD}>D</span>
          <span className={styles.logoDash}>-</span>
          <span className={styles.logoC}>C</span>
          <span className={styles.logoA}>a</span>
          <span className={styles.logoR}>r</span>
          <span className={styles.logoE}>e</span>
        </div>
        <h2 className={styles.title}>Pharmacy Management</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" autoFocus />
          </div>
          <div className={styles.field}>
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </div>
          <button type="submit" className={styles.loginBtn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
