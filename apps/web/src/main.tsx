import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { LoginPage, RegisterPage } from './pages/Auth';
import { DashboardPage } from './pages/Dashboard';
import { VerificationPage } from './pages/Verification';
import { ExplorePage } from './pages/Explore';
import { MatchesPage } from './pages/Matches';
import { PartnerPage } from './pages/Partner';
import { ProfilePage } from './pages/Profile';
import { ChatListPage, ConversationPage } from './pages/Chat';
import { AgreementsPage } from './pages/Agreements';
import { RatingPage } from './pages/Rating';
import { CheckoutPage } from './pages/Checkout';
import { AdminPage } from './pages/Admin';
import { InvestorPage } from './pages/Investor';
import { PortfolioPage } from './pages/Portfolio';
import { isAuthed, type Role } from './lib/api';
import { readSession } from './lib/session';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGuard() {
  const location = useLocation();
  // Bawa tujuan aslinya supaya setelah masuk pengguna mendarat di halaman yang
  // tadi diklik, bukan dilempar ke beranda tanpa penjelasan.
  if (!isAuthed())
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, notice: 'Masuk dulu untuk membuka halaman itu.' }}
      />
    );
  return <Outlet />;
}

function RoleGuard({ roles }: { roles: Role[] }) {
  const session = readSession();
  if (!session || !roles.includes(session.role))
    return (
      <Navigate
        to="/app/beranda"
        replace
        state={{ notice: 'Halaman itu khusus investor.', noticeTone: 'info' }}
      />
    );
  return <Outlet />;
}

/**
 * Kebalikan AuthGuard. Tanpa ini, pengguna yang sudah masuk lalu membuka `/`
 * melihat hero publik dengan nav aplikasi menempel di atas dan di bawahnya —
 * terbaca seperti halaman bocor, padahal cuma tidak ada penjaga arah sebaliknya.
 */
function PublicOnly() {
  if (isAuthed()) return <Navigate to="/app/beranda" replace />;
  return <Outlet />;
}

/**
 * Pemetaan 17 layar Stitch ke rute, sesuai urutan alur onboarding sampai
 * kerja sama selesai.
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Publik — tertutup untuk yang sudah masuk */}
      <Route element={<PublicOnly />}>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/login" element={<Layout><LoginPage /></Layout>} />
        <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
      </Route>

      <Route element={<AuthGuard />}>
        <Route path="/app" element={<Layout><Outlet /></Layout>}>
          <Route index element={<Navigate to="/app/beranda" replace />} />

          {/* Fondasi */}
          <Route path="beranda" element={<DashboardPage />} />
          <Route path="verifikasi" element={<VerificationPage />} />
          {/* Layar status review memakai halaman yang sama; statusnya sudah tampil di sana */}
          <Route path="verifikasi/status" element={<Navigate to="/app/verifikasi" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="rekam-jejak" element={<PortfolioPage />} />
          {/* Rute lama tetap hidup supaya tautan yang sudah beredar tidak mati */}
          <Route path="rekam-danai" element={<Navigate to="/app/rekam-jejak" replace />} />

          {/* Pencarian dan pencocokan */}
          <Route path="explore" element={<ExplorePage />} />
          <Route path="mitra/:id" element={<PartnerPage />} />

          {/* Kolaborasi */}
          <Route path="chat" element={<ChatListPage />} />
          <Route path="chat/:id" element={<ConversationView />} />
          <Route path="agreements" element={<AgreementsPage />} />

          {/* Pelengkap */}
          <Route path="rating" element={<RatingPage />} />
          <Route path="rating/:agreementId" element={<RatingPage />} />
          <Route path="pembayaran" element={<CheckoutPage />} />

          <Route element={<RoleGuard roles={['INVESTOR']} />}>
            <Route path="matches" element={<MatchesPage />} />
            <Route path="preferensi" element={<InvestorPage />} />
          </Route>

          <Route element={<RoleGuard roles={['ADMIN']} />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Rute chat memakai conversationId. */
function ConversationView() {
  const { id } = useParams();
  return <ConversationPage conversationId={id ?? ''} />;
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
  </StrictMode>,
);
