"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { seedDefaultData } from '../../lib/db';
import { Menu } from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { LoginModal } from '../auth/LoginModal';

export function PageWrapper({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const prevUser = useRef<typeof user>(undefined);

  useEffect(() => {
    seedDefaultData().catch(console.error);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setShowLogin(true);
    } else {
      setShowLogin(false);
      // redirect to dashboard only when transitioning from logged-out → logged-in
      if (prevUser.current === null) {
        router.push('/');
      }
    }
    prevUser.current = user;
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div
        className={`flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden transition-all duration-300 ${
          !user ? 'blur-sm pointer-events-none select-none' : ''
        }`}
      >
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="md:hidden bg-gray-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/rkpumps-79028.firebasestorage.app/o/rkpumpslogo.webp?alt=media&token=fd05d40d-4c59-401b-ba6b-3918230bbf59"
                alt="Logo"
                className="h-8 w-8 rounded-full object-cover"
              />
            </div>
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-300 hover:text-white">
              <Menu size={24} />
            </button>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>

      {/* Clickable overlay when not logged in and modal is dismissed */}
      {!user && !showLogin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
          onClick={() => setShowLogin(true)}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-8 py-5 shadow-xl text-center border border-gray-100">
            <p className="text-gray-800 font-semibold text-sm">Click anywhere to login</p>
            <p className="text-gray-500 text-xs mt-1">Admin access required</p>
          </div>
        </div>
      )}

      {!user && showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}
    </>
  );
}
