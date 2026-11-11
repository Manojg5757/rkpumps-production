import {
  LayoutDashboard, Package, Receipt, FileText, Users, Truck, Wallet, BarChart2, Settings, ScrollText, LifeBuoy, LucideIcon,
} from 'lucide-react';

export type NavItem = { name: string; href: string; icon: LucideIcon };
export type NavGroup = { label?: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard }] },
  {
    label: 'Sales',
    items: [
      { name: 'New Invoice', href: '/billing', icon: Receipt },
      { name: 'Sales History', href: '/sales', icon: ScrollText },
      { name: 'Quotations', href: '/quotation', icon: FileText },
      { name: 'Customers', href: '/customers', icon: Users },
    ],
  },
  {
    label: 'Stock & purchases',
    items: [
      { name: 'Inventory', href: '/inventory', icon: Package },
      { name: 'Suppliers', href: '/suppliers', icon: Truck },
      { name: 'Expenses', href: '/expenses', icon: Wallet },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart2 },
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Help', href: '/help', icon: LifeBuoy },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/billing': 'New Invoice',
  '/sales': 'Sales History',
  '/quotation': 'Quotations',
  '/customers': 'Customers',
  '/inventory': 'Inventory',
  '/suppliers': 'Suppliers',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/help': 'Help',
};
