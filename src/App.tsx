import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './app/appStore';
import { initializeDatabase } from './data/db';
import { syncPublishedLessons } from './data/publishedContent';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { WordSetEditorPage } from './pages/WordSetEditorPage';
import { PreparePage } from './pages/PreparePage';
import { BattlePage } from './pages/BattlePage';
import { ResultsPage } from './pages/ResultsPage';
import { ReviewPage } from './pages/ReviewPage';
import { StorePage } from './pages/StorePage';
import { WardrobePage } from './pages/WardrobePage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { getAssetUrl } from './utils/assetUrl';
import { AppShell } from './components/AppShell';
import { AccountPage } from './pages/AccountPage';
import { EventsPage, GiftsPage, LeaderboardPage } from './pages/CommunityPages';

const AppContent: React.FC = () => {
  const { currentRoute } = useApp();
  const { account } = useAuth();

  if (!account && ['prepare', 'battle', 'editor', 'settings', 'wardrobe', 'review', 'progress', 'admin'].includes(currentRoute)) {
    return <AppShell><AccountPage /></AppShell>;
  }

  let page: React.ReactNode;
  switch (currentRoute) {
    case 'home':
      page = <HomePage />;
      break;
    case 'library':
      page = <LibraryPage />;
      break;
    case 'editor':
      page = <WordSetEditorPage />;
      break;
    case 'prepare':
      page = <PreparePage />;
      break;
    case 'battle':
      return <BattlePage />;
    case 'results':
      page = <ResultsPage />;
      break;
    case 'review':
      page = <ReviewPage />;
      break;
    case 'store':
      page = <StorePage />;
      break;
    case 'wardrobe':
      page = <WardrobePage />;
      break;
    case 'progress':
      page = <ProgressPage />;
      break;
    case 'settings':
      page = <SettingsPage />;
      break;
    case 'admin':
      page = <AdminPage />;
      break;
    case 'account':
      page = <AccountPage />;
      break;
    case 'leaderboard':
      page = <LeaderboardPage />;
      break;
    case 'gifts':
      page = <GiftsPage />;
      break;
    case 'events':
      page = <EventsPage />;
      break;
    default:
      page = <HomePage />;
  }

  return <AppShell>{page}</AppShell>;
};

const AuthenticatedApplication: React.FC = () => {
  const { account, ready } = useAuth();

  if (!ready) {
    return (
      <div className="notebook-grid-bg app-loading-screen">
        <img src={getAssetUrl('/pempom.svg')} alt="" />
        <span>Đang kiểm tra phiên đăng nhập…</span>
      </div>
    );
  }

  return (
    <AppProvider key={account?.id || 'visitor'}>
      <AppContent />
    </AppProvider>
  );
};

export const App: React.FC = () => {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;
    initializeDatabase()
      .then(() => syncPublishedLessons().catch(() => {}))
      .then(() => {
        if (isActive) setDbReady(true);
      })
      .catch((error) => {
        if (isActive) {
          setDbError(error instanceof Error ? error.message : 'Không thể mở dữ liệu trò chơi.');
        }
      });

    return () => {
      isActive = false;
    };
  }, [retryCount]);

  if (dbError) {
    return (
      <div
        className="notebook-grid-bg"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-danger)' }}>
          Không thể khởi động pempom
        </h1>
        <p style={{ maxWidth: '560px', color: 'var(--color-muted-ink)' }}>{dbError}</p>
        <button
          className="sticker-button"
          onClick={() => {
            setDbError(null);
            setRetryCount((count) => count + 1);
          }}
        >
          Thử Lại
        </button>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div
        className="notebook-grid-bg"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '1.4rem',
          fontWeight: 800,
          color: 'var(--color-ink)',
        }}
      >
        Đang khởi động pempom...
      </div>
    );
  }

  return (
    <AuthProvider>
      <AuthenticatedApplication />
    </AuthProvider>
  );
};

export default App;
