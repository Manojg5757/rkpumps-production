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
  );
}
