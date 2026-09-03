import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { LoginPage, RegisterPage } from './pages/Auth';
import { ExplorePage } from './pages/Explore';
import { MatchesPage } from './pages/Matches';
import { ProfilePage } from './pages/Profile';
import { ChatListPage, ConversationPage } from './pages/Chat';
import { AgreementsPage } from './pages/Agreements';
import { AdminPage } from './pages/Admin';
import { InvestorPage } from './pages/Investor';
import { PortfolioPage } from './pages/Portfolio';
import { isAuthed } from './lib/api';
import { readSession } from './lib/session';

const queryClient = new QueryClient();

type Role = 'UMKM' | 'INVESTOR' | 'ADMIN';

function AuthGuard() {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RoleGuard({ roles }: { roles: Role[] }) {
  const session = readSession();
  if (!session || !roles.includes(session.role)) {
    return <Navigate to="/app/explore" replace />;
  }
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/login" element={<Layout><LoginPage /></Layout>} />
      <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
      <Route element={<AuthGuard />}>
        <Route path="/app" element={<Layout><Outlet /></Layout>}>
          <Route path="explore" element={<ExplorePage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="chat" element={<ChatListPage />} />
          <Route path="chat/:id" element={<ConversationView />} />
          <Route path="agreements" element={<AgreementsPage />} />
          <Route element={<RoleGuard roles={['ADMIN']} />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route element={<RoleGuard roles={['INVESTOR']} />}>
            <Route path="preferensi" element={<InvestorPage />} />
            <Route path="rekam-danai" element={<PortfolioPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ConversationView() {
  const { id } = useParams();
  return <ConversationPage connectionId={id ?? ''} />;
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>
);