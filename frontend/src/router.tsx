import { Navigate, createBrowserRouter } from 'react-router-dom';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { TriagePage } from './pages/TriagePage';
import { HistoryPage } from './pages/HistoryPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminPage } from './pages/AdminPage';
import { ImplementationGuidePage } from './pages/ImplementationGuidePage';
import { CommunityPage } from './pages/CommunityPage';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { HomePage } from './pages/HomePage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ManagerRoute } from './components/auth/ManagerRoute';

export const router = createBrowserRouter([
  {
    path: '/landing',
    element: <LandingPage />,
  },
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'triage',
        element: (
          <ProtectedRoute>
            <TriagePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'auth/callback',
        element: <AuthCallbackPage />,
      },
      {
        path: 'history',
        element: (
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'history/:sessionId',
        element: (
          <ProtectedRoute>
            <SessionDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'leaderboard',
        element: (
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute>
            <ManagerRoute>
              <AdminPage />
            </ManagerRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: 'guide/:projectId',
        element: (
          <ProtectedRoute>
            <ImplementationGuidePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'community',
        element: (
          <ProtectedRoute>
            <CommunityPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'legal/privacy',
        element: <PrivacyPolicyPage />,
      },
      {
        path: 'privacy-policy',
        element: <Navigate to="/legal/privacy" replace />,
      },
    ],
  },
]);