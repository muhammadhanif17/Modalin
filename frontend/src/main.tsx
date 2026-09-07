import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { isAuthed, type Role } from './lib/api';
import { readSession } from './lib/session';

// Lazy: tiap halaman jadi chunk terpisah. Bundle awal hanya memuat shell + landing + auth.
const HomePage = lazy(() => import('./pages/Home').then((m) => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./features/dashboard').then((m) => ({ default: m.DashboardPage })));
const VerificationPage = lazy(() => import('./pages/Verification').then((m) => ({ default: m.VerificationPage })));
const ExplorePage = lazy(() => import('./pages/Explore').then((m) => ({ default: m.ExplorePage })));
const MatchesPage = lazy(() => import('./pages/Matches').then((m) => ({ default: m.MatchesPage })));
const PartnerPage = lazy(() => import('./pages/Partner').then((m) => ({ default: m.PartnerPage })));
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })));
const ProfileEditUmkmPage = lazy(() =>
  import('./features/profile-edit-umkm').then((m) => ({ default: m.ProfileEditUmkmPage })),
);
const ChatListPage = lazy(() => import('./pages/Chat').then((m) => ({ default: m.ChatListPage })));
const ConversationPage = lazy(() => import('./pages/Chat').then((m) => ({ default: m.ConversationPage })));
const AgreementsPage = lazy(() => import('./pages/Agreements').then((m) => ({ default: m.AgreementsPage })));
const RatingPage = lazy(() => import('./pages/Rating').then((m) => ({ default: m.RatingPage })));
const CheckoutPage = lazy(() => import('./pages/Checkout').then((m) => ({ default: m.CheckoutPage })));
const AdminPage = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminPage })));
const InvestorPage = lazy(() => import('./pages/Investor').then((m) => ({ default: m.InvestorPage })));
const InvestorEditPage = lazy(() => import('./features/investor-edit').then((m) => ({ default: m.InvestorEditPage })));
const PortfolioPage = lazy(() => import('./pages/Portfolio').then((m) => ({ default: m.PortfolioPage })));

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

/** Rute chat memakai conversationId. */
function ConversationView() {
  const { id } = useParams();
  return <ConversationPage conversationId={id ?? ''} />;
}

const PageFallback = () => (
  <div className="center-wrap" style={{ minHeight: '60vh' }}>
    <Spinner />
  </div>
);

const lazyRoute = (Comp: React.ComponentType) => (
  <Suspense fallback={<PageFallback />}>
    <Comp />
  </Suspense>
);

/**
 * Pemetaan 17 layar Stitch ke rute, sesuai urutan alur onboarding sampai
 * kerja sama selesai.
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Publik — tertutup untuk yang sudah masuk */}
      <Route element={<PublicOnly />}>
        <Route path="/" element={<Layout>{lazyRoute(HomePage)}</Layout>} />
        <Route path="/login" element={<Layout>{lazyRoute(LoginPage)}</Layout>} />
        <Route path="/register" element={<Layout>{lazyRoute(RegisterPage)}</Layout>} />
      </Route>

      <Route element={<AuthGuard />}>
        <Route path="/app" element={<Layout><Outlet /></Layout>}>
          <Route index element={<Navigate to="/app/beranda" replace />} />

          {/* Fondasi */}
          <Route path="beranda" element={lazyRoute(DashboardPage)} />
          <Route path="verifikasi" element={lazyRoute(VerificationPage)} />
          <Route path="verifikasi/status" element={<Navigate to="/app/verifikasi" replace />} />
          <Route path="profile" element={lazyRoute(ProfilePage)} />
          <Route path="profile/edit" element={lazyRoute(ProfileEditUmkmPage)} />
          <Route path="rekam-jejak" element={lazyRoute(PortfolioPage)} />
          <Route path="rekam-danai" element={<Navigate to="/app/rekam-jejak" replace />} />

          {/* Pencarian dan pencocokan */}
          <Route path="explore" element={lazyRoute(ExplorePage)} />
          <Route path="mitra/:id" element={lazyRoute(PartnerPage)} />

          {/* Kolaborasi */}
          <Route path="chat" element={lazyRoute(ChatListPage)} />
          <Route path="chat/:id" element={<ConversationView />} />
          <Route path="agreements" element={lazyRoute(AgreementsPage)} />

          {/* Pelengkap */}
          <Route path="rating" element={lazyRoute(RatingPage)} />
          <Route path="rating/:agreementId" element={lazyRoute(RatingPage)} />
          <Route path="pembayaran" element={lazyRoute(CheckoutPage)} />

          <Route path="matches" element={lazyRoute(MatchesPage)} />

          {/* Preferensi tetap khusus investor: UMKM tidak punya data ini */}
          <Route element={<RoleGuard roles={['INVESTOR']} />}>
            <Route path="preferensi" element={lazyRoute(InvestorPage)} />
            <Route path="preferensi/edit" element={lazyRoute(InvestorEditPage)} />
          </Route>

          <Route element={<RoleGuard roles={['ADMIN']} />}>
            <Route path="admin" element={lazyRoute(AdminPage)} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
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
