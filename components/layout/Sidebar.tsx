"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Receipt, History, BarChart2, Users, Truck, X, LogOut, FileText } from 'lucide-react';
import { BUSINESS_INFO } from '../../lib/config';
import { useAuth } from '../../lib/authContext';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'New Invoice', href: '/billing', icon: Receipt },
  { name: 'Quotation', href: '/quotation', icon: FileText },
  { name: 'Sales History', href: '/sales', icon: History },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Reports', href: '/reports', icon: BarChart2 },
];

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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen?.(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col
        transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-5 text-xl font-bold border-b border-gray-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/rkpumps-79028.firebasestorage.app/o/rkpumpslogo.webp?alt=media&token=fd05d40d-4c59-401b-ba6b-3918230bbf59"
              alt="Logo"
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-base font-bold leading-tight">{BUSINESS_INFO.name}</span>
          </div>
          <button
            className="md:hidden text-gray-400 hover:text-white p-1 -mr-2"
            onClick={() => setIsOpen?.(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen?.(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          {user && (
            <p className="text-xs text-gray-500 px-3 pb-2 truncate">{user.email}</p>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
          <p className="text-xs text-gray-600 text-center mt-3">R.K Pumps &amp; Motors POS</p>
        </div>
      </div>
    </>
  );
}
