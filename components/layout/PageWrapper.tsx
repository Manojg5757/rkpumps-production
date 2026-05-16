"use client";

import { ReactNode, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { seedDefaultData } from '../../lib/db';

export function PageWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    seedDefaultData().catch(console.error);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
