import { render, screen } from '@testing-library/react';
import { Sidebar } from '../components/layout/Sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname() {
    return '/';
  },
}));

describe('Sidebar Component', () => {
  it('renders all navigation links', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('New Invoice')).toBeInTheDocument();
    expect(screen.getByText('Sales History')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });
});
