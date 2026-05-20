import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SkipLink } from './SkipLink';
import { RouteAnnouncer } from './RouteAnnouncer';
import { DesktopHeader } from './DesktopHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
import { BackgroundGradientAnimation } from '../ui/background-gradient-animation';
import { useTheme } from '../../contexts/ThemeContext';
import { APP_GRADIENT_DARK, APP_GRADIENT_LIGHT } from '../analysisTheme';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  useScrollRestoration();
  const { theme } = useTheme();
  const location = useLocation();

  const backgroundProps = theme === 'dark' ? APP_GRADIENT_DARK : APP_GRADIENT_LIGHT;
  const isHomeRoute = location.pathname === '/';

  return (
    <BackgroundGradientAnimation
      key={theme}
      interactive={true}
      className="relative z-10"
      containerClassName="min-h-dvh h-auto w-full"
      {...backgroundProps}
    >
      <div className="relative isolate min-h-dvh flex flex-col">
        <SkipLink />

        <div className="hidden md:block sticky top-0 z-40">
          <DesktopHeader />
        </div>

        <main
          id="main-content"
          className={
            isHomeRoute
              ? 'w-full flex-1 max-w-none mx-0 px-0 pt-0 pb-[calc(64px+0px)] md:pb-0 focus:outline-none focus-visible:outline-none'
              : 'w-full flex-1 max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-[calc(64px+32px)] md:pb-8 focus:outline-none focus-visible:outline-none'
          }
        >
          {children}
        </main>

        {!isHomeRoute && (
          <footer className="w-full mt-auto pb-[calc(64px+12px)] md:pb-5">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
              <div
                className="text-[11px] md:text-xs flex items-center justify-center gap-3"
                style={{ color: 'color-mix(in srgb, var(--color-text-muted) 78%, transparent)' }}
              >
                <a
                  href="/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline underline-offset-2 transition-opacity"
                  style={{ color: 'inherit' }}
                >
                  Privacy Policy
                </a>
                <span aria-hidden="true">·</span>
                <span>© {new Date().getFullYear()} ReSource AI</span>
              </div>
            </div>
          </footer>
        )}

        <div className="flex md:hidden">
          <MobileBottomNav />
        </div>

        <RouteAnnouncer />
      </div>
    </BackgroundGradientAnimation>
  );
}

export default AppShell;
