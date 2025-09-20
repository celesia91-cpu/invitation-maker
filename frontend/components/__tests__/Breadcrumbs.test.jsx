import { render, screen, within } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import Breadcrumbs from '../Breadcrumbs.jsx';
import { MockAppStateProvider } from '../../context/AppStateContext.jsx';
import { createMockRouter } from '../../test/utils/createMockRouter.js';

describe('Breadcrumbs', () => {
  const renderWithProviders = ({ value, router } = {}) => {
    const mockRouter = router ?? createMockRouter();

    return render(
      <RouterContext.Provider value={mockRouter}>
        <MockAppStateProvider value={value}>
          <Breadcrumbs />
        </MockAppStateProvider>
      </RouterContext.Provider>
    );
  };

  it('renders a nav with the breadcrumbs class and aria-label', () => {
    renderWithProviders();

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });

    expect(nav.tagName).toBe('NAV');
    expect(nav).toHaveClass('breadcrumbs');
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
  });

  it('renders an ordered list of navigation links and marks the current page', () => {
    renderWithProviders({
      value: {
        navigationHistory: [
          { href: '/', label: 'Home' },
          { href: '/editor', label: 'Editor' },
          { href: '/editor/layers', label: 'Layers' },
        ],
      },
    });

    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[0]).not.toHaveAttribute('aria-current');
    expect(links[1]).toHaveAttribute('href', '/editor');
    expect(links[2]).toHaveAttribute('href', '/editor/layers');
    expect(links[2]).toHaveAttribute('aria-current', 'page');
  });

  it('falls back to the current route when navigation history is empty', () => {
    const router = createMockRouter({ asPath: '/templates/birthday-party', pathname: '/templates/[slug]' });
    renderWithProviders({ router });

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const links = within(nav).getAllByRole('link');

    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent('Marketplace');
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[0]).not.toHaveAttribute('aria-current');

    expect(links[1]).toHaveTextContent('Birthday Party');
    expect(links[1]).toHaveAttribute('href', '/templates/birthday-party');
    expect(links[1]).toHaveAttribute('aria-current', 'page');
  });

  it('prepends admin role waypoints when history is seeded', () => {
    renderWithProviders({
      value: {
        userRole: 'admin',
        navigationHistory: [
          { href: '/editor', label: 'Editor' },
        ],
      },
    });

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const links = within(nav).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual([
      'Marketplace',
      'Admin Dashboard',
      'Editor',
    ]);
  });
});
