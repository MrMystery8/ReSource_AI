import { Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <div className="min-h-dvh bg-surface">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>

          <Header />

          <main
            id="main-content"
            className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"
          >
            <Outlet />
          </main>
        </div>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
