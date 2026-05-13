import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TriagePage } from './pages/TriagePage';
import { HistoryPage } from './pages/HistoryPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminPage } from './pages/AdminPage';
import { ImplementationGuidePage } from './pages/ImplementationGuidePage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ManagerRoute } from './components/auth/ManagerRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
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
    ],
  },
]);
