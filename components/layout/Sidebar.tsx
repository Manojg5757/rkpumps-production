"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LogOut } from 'lucide-react';
import { BUSINESS_INFO } from '../../lib/config';
import { useAuth } from '../../lib/authContext';
import { NAV_GROUPS } from './nav';

export const LOGO_URL = "/logo-mark.png";

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-ink/50 z-[70] md:hidden" onClick={() => setIsOpen?.(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[80] w-72 md:w-60 bg-ink text-white flex flex-col
          transition-transform duration-200 ease-out md:relative md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-16 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <img src={LOGO_URL} alt="R.K Pumps logo" width={40} height={40} className="h-10 w-10 rounded-xl object-contain bg-white p-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight truncate">{BUSINESS_INFO.name}</p>
              <p className="text-xs text-white/50">Billing &amp; stock</p>
            </div>
          </div>
          <button className="md:hidden icon-btn text-white/70 hover:bg-white/10" onClick={() => setIsOpen?.(false)} aria-label="Close menu">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.label && <p className="px-3 pb-1.5 text-xs font-medium text-white/40">{group.label}</p>}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen?.(false)}
                      className={`flex items-center gap-3 px-3 h-11 md:h-10 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-white text-ink font-semibold' : 'text-white/75 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-brand-600' : ''} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          {user?.email && <p className="text-xs text-white/40 px-3 pb-2 truncate">{user.email}</p>}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-white/60 hover:bg-white/10 hover:text-white text-sm transition-colors"
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
