"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, LOGO_URL } from './Sidebar';
import { MobileNav } from './MobileNav';
import { PAGE_TITLES } from './nav';
import { seedDefaultData } from '../../lib/db';
import { ArrowLeft, HelpCircle, Menu } from 'lucide-react';
import Link from 'next/link';
import { PAGE_HELP } from '../../lib/helpContent';
import { useAuth } from '../../lib/authContext';
import { LoginModal } from '../auth/LoginModal';

/** Screens where the bottom tab bar is hidden (they have their own sticky action bar). */
const FOCUS_ROUTES = ['/billing', '/quotation'];

export function PageWrapper({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const prevUser = useRef<typeof user>(undefined);

  useEffect(() => {
    if (user) seedDefaultData().catch(console.error);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setShowLogin(true);
    } else {
      setShowLogin(false);
      // redirect to dashboard only when transitioning from logged-out → logged-in
      if (prevUser.current === null) router.push('/');
    }
    prevUser.current = user;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-surface">
        <div className="h-8 w-8 border-[3px] border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isFocus = FOCUS_ROUTES.some(r => pathname.startsWith(r));
  const title = PAGE_TITLES[pathname] || '';

  return (
    <>
      <div className={`flex h-[100dvh] bg-surface text-ink overflow-hidden ${!user ? 'blur-sm pointer-events-none select-none' : ''}`}>
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile top bar */}
          <header className="md:hidden bg-white border-b border-line pt-safe shrink-0">
            <div className="h-14 px-2 flex items-center gap-1">
              {isFocus ? (
                <button onClick={() => router.back()} className="icon-btn" aria-label="Back"><ArrowLeft size={22} /></button>
              ) : (
                <button onClick={() => setSidebarOpen(true)} className="icon-btn" aria-label="Open menu"><Menu size={22} /></button>
              )}
              <p className="flex-1 font-semibold text-[17px] text-ink truncate px-1">{title}</p>
              {pathname !== '/help' && (
                <Link href={`/help${PAGE_HELP[pathname] ? `#${PAGE_HELP[pathname]}` : ''}`} className="icon-btn" aria-label="Help for this page">
                  <HelpCircle size={21} />
                </Link>
              )}
              <img src={LOGO_URL} alt="R.K Pumps logo" width={32} height={32} className="h-8 w-8 object-contain mr-2" />
            </div>
          </header>
          <main id="main-scroll" className={`flex-1 overflow-y-auto overscroll-contain ${isFocus ? 'pb-4' : 'pb-24'} md:pb-8`}>
            <div className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-8 md:pt-8">{children}</div>
          </main>
        </div>
      </div>

      {user && !isFocus && <MobileNav onMenu={() => setSidebarOpen(true)} />}

      {!user && !showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer" onClick={() => setShowLogin(true)}>
          <div className="bg-white rounded-xl px-8 py-5 shadow-xl text-center border border-line">
            <p className="text-ink font-semibold text-sm">Tap anywhere to log in</p>
          </div>
        </div>
      )}

      {!user && showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
