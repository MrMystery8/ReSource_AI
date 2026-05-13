import { Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { ParticlesBackground } from './components/ParticlesBackground';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-animated relative overflow-hidden">
          <ParticlesBackground />

          <div className="relative z-10">
            <Header />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
              <Outlet />
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
