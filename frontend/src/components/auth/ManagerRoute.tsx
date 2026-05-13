import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Route wrapper that restricts access to users with the 'manager' role.
 * If the user is not a manager, they are redirected to / with an access denied alert.
 * This component should be nested inside ProtectedRoute (auth check happens first).
 */
export function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (user?.role !== 'manager') {
    // Store access denied message for the home page to display
    sessionStorage.setItem('toast', 'Access denied');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
