import { render, screen } from '@testing-library/react';
import Breadcrumbs from '../Breadcrumbs.jsx';

describe('Breadcrumbs', () => {
  it('renders a nav with the breadcrumbs class and aria-label', () => {
    render(<Breadcrumbs />);

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });

    expect(nav.tagName).toBe('NAV');
    expect(nav).toHaveClass('breadcrumbs');
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
  });
});
