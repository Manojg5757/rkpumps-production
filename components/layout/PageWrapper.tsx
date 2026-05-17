"use client";

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { seedDefaultData } from '../../lib/db';
import { Menu } from 'lucide-react';
import { BUSINESS_INFO } from '../../lib/config';

export function PageWrapper({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    seedDefaultData().catch(console.error);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-gray-900 text-white p-4 flex items-center justify-between">
          <span className="font-bold text-lg">{BUSINESS_INFO.name}</span>
          <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-300 hover:text-white">
            <Menu size={24} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
