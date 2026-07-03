'use client';
import { Provider } from 'react-redux';
import { usePathname } from 'next/navigation';
import { store } from '@/store/store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@mantine/core/styles.css';
import 'mantine-react-table/styles.css';
import '@/styles/globals.css';
import { MantineProvider } from '@mantine/core';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useState } from 'react';
import styles from './layout.module.css';

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isLoginPage = pathname === '/auth/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className={styles.appShell}>
      <div className={`${styles.sidebarWrapper} ${!sidebarOpen ? styles.sidebarHidden : ''}`}>
        <Sidebar />
      </div>
      <div className={styles.mainArea}>
        <Topbar onMenuToggle={() => setSidebarOpen((p) => !p)} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>D-Care</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Provider store={store}>
          <MantineProvider>
            <AppShell>{children}</AppShell>
            <ToastContainer position="top-right" autoClose={3000} />
          </MantineProvider>
        </Provider>
      </body>
    </html>
  );
}
