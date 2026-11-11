import { render, screen } from '@testing-library/react';
import { Sidebar } from '../components/layout/Sidebar';

jest.mock('next/navigation', () => ({
  usePathname() {
    return '/';
  },
}));

jest.mock('../lib/authContext', () => ({
  useAuth: () => ({ user: { email: 'owner@example.com' }, logout: jest.fn() }),
}));

describe('Sidebar Component', () => {
  it('renders all navigation links', () => {
    render(<Sidebar />);

    for (const label of ['Dashboard', 'New Invoice', 'Sales History', 'Quotations', 'Customers', 'Inventory', 'Suppliers', 'Expenses', 'Reports', 'Settings', 'Help']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
