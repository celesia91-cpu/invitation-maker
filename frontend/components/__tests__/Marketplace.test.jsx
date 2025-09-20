import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Marketplace from '../Marketplace.jsx';
import useAuth from '../../hooks/useAuth.js';

jest.mock('../../hooks/useAuth.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

function mockAuth({
  role = 'consumer',
  user: userOverrides = {},
  listings = [],
  implementation,
  apiOverrides = {},
} = {}) {
  const normalizedListings = listings.map((listing, index) => ({
    id: listing.id ?? String(index + 1),
    title: listing.title ?? `Design ${index + 1}`,
    designer: listing.designer ?? { displayName: `Designer ${index + 1}` },
    badges: listing.badges ?? [],
    ...listing,
  }));

  const listMarketplace =
    implementation ??
    jest.fn().mockResolvedValue({
      role,
      data: normalizedListings,
    });

  const user = { role, ...userOverrides };

  const api = { listMarketplace, ...apiOverrides };

  useAuth.mockReturnValue({
    user,
    api,
    isAuthenticated: true,
    loading: false,
    error: null,
  });

  return { listMarketplace, api };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Marketplace', () => {
  it('toggles the hidden class on the root element when isOpen changes', async () => {
    const { listMarketplace } = mockAuth({ listings: [] });

    const { container, rerender } = render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    const openRoot = container.querySelector('#marketplacePage');
    expect(openRoot).toBeInTheDocument();
    expect(openRoot).not.toHaveClass('hidden');

    rerender(<Marketplace isOpen={false} onSkipToEditor={jest.fn()} />);
    const closedRoot = container.querySelector('#marketplacePage');
    expect(closedRoot).toHaveClass('hidden');

    rerender(<Marketplace isOpen onSkipToEditor={jest.fn()} />);
    const reopenedRoot = container.querySelector('#marketplacePage');
    expect(reopenedRoot).not.toHaveClass('hidden');

    await waitFor(() => expect(listMarketplace).toHaveBeenCalled());
  });

  it('moves focus and updates aria-selected when navigating categories with the keyboard', async () => {
    const { listMarketplace } = mockAuth({ listings: [] });
    const user = userEvent.setup();

    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    tabs[0].focus();
    expect(tabs[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{ArrowUp}');
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{End}');
    const lastIndex = tabs.length - 1;
    expect(tabs[lastIndex]).toHaveFocus();
    expect(tabs[lastIndex]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{Home}');
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[lastIndex]).toHaveAttribute('aria-selected', 'false');

    await waitFor(() => expect(listMarketplace).toHaveBeenCalled());
  });

  it('prevents navigation and triggers onSkipToEditor when the skip link is clicked', async () => {
    const { listMarketplace } = mockAuth({ listings: [] });
    const user = userEvent.setup();
    const onSkipToEditor = jest.fn();

    render(<Marketplace isOpen onSkipToEditor={onSkipToEditor} />);

    const skipLink = screen.getByRole('link', { name: /skip to blank editor/i });
    const capturedEvents = [];
    skipLink.addEventListener('click', (event) => {
      capturedEvents.push(event);
    });

    await user.click(skipLink);

    expect(onSkipToEditor).toHaveBeenCalledTimes(1);
    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0].defaultPrevented).toBe(true);

    await waitFor(() => expect(listMarketplace).toHaveBeenCalled());
  });

  it('requests new listings when the search input changes', async () => {
    const listMarketplace = jest.fn().mockResolvedValue({ role: 'consumer', data: [] });
    mockAuth({ role: 'consumer', implementation: listMarketplace });
    const user = userEvent.setup();

    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    await waitFor(() => expect(listMarketplace).toHaveBeenCalledTimes(1));

    const searchInput = screen.getByPlaceholderText(/search designs/i);
    await user.type(searchInput, 'w');

    await waitFor(() => expect(listMarketplace).toHaveBeenCalledTimes(2));
    expect(listMarketplace.mock.calls[1][0]).toEqual({
      role: 'consumer',
      category: undefined,
      search: 'w',
    });
  });

  it('requests category-specific listings when a new category is selected', async () => {
    const listMarketplace = jest.fn().mockResolvedValue({ role: 'consumer', data: [] });
    mockAuth({ role: 'consumer', implementation: listMarketplace });
    const user = userEvent.setup();

    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    await waitFor(() => expect(listMarketplace).toHaveBeenCalledTimes(1));

    const weddingTab = screen.getByRole('tab', { name: /wedding/i });
    await user.click(weddingTab);

    await waitFor(() => expect(listMarketplace).toHaveBeenCalledTimes(2));
    expect(listMarketplace.mock.calls[1][0]).toEqual({
      role: 'consumer',
      category: 'wedding',
      search: undefined,
    });
  });

  it('renders consumer listings for consumer role responses', async () => {
    const consumerListings = [
      {
        id: '1',
        title: 'Sample Birthday Invite',
        designer: { displayName: 'Studio Omega' },
      },
    ];
    const { listMarketplace } = mockAuth({ role: 'consumer', listings: consumerListings });

    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    const card = await screen.findByTestId('marketplace-card-1');
    expect(card).toHaveTextContent('Sample Birthday Invite');
    expect(card).toHaveTextContent('Studio Omega');

    expect(listMarketplace).toHaveBeenCalledTimes(1);
    expect(listMarketplace.mock.calls[0][0]).toEqual({
      role: 'consumer',
      category: undefined,
      search: undefined,
    });
  });

  it('renders creator listings with flags for creator role responses', async () => {
    const creatorListings = [
      {
        id: '2',
        title: 'Wedding Announcement',
        designer: { displayName: 'Demo Creator' },
        flags: { isAdminTemplate: true, managedByAdminId: '1' },
      },
    ];
    const { listMarketplace } = mockAuth({ role: 'creator', listings: creatorListings });

    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    const card = await screen.findByTestId('marketplace-card-2');
    expect(card).toHaveTextContent('Wedding Announcement');
    expect(card).toHaveTextContent('Demo Creator');
    expect(card).toHaveTextContent('isAdminTemplate: true');

    expect(listMarketplace).toHaveBeenCalledTimes(1);
    expect(listMarketplace.mock.calls[0][0]).toEqual({
      role: 'creator',
      category: undefined,
      search: undefined,
    });
  });

  it('does not render admin-only analytics for non-admin roles', async () => {
    const { listMarketplace } = mockAuth({ role: 'consumer', listings: [] });

    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    await waitFor(() => expect(listMarketplace).toHaveBeenCalledTimes(1));

    expect(screen.queryByTestId('admin-marketplace-analytics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-marketplace-card-extras')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manage listing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publish listing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete listing/i })).not.toBeInTheDocument();
  });

  it('renders admin marketplace analytics and controls for admin role responses', async () => {
    const user = userEvent.setup();
    const manageMarketplaceListing = jest.fn();
    const publishMarketplaceListing = jest.fn();
    const deleteMarketplaceListing = jest.fn();
    const adminListings = [
      {
        id: '1',
        title: 'Premium Event Template',
        designer: { displayName: 'Studio Omega' },
        conversionRate: 0.5,
        flags: { managedBy: 'ops-team' },
        status: 'draft',
      },
    ];
    const { listMarketplace } = mockAuth({
      role: 'admin',
      listings: adminListings,
      apiOverrides: {
        manageMarketplaceListing,
        publishMarketplaceListing,
        deleteMarketplaceListing,
      },
    });

    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    const analytics = await screen.findByTestId('admin-marketplace-analytics');
    expect(analytics).toHaveTextContent('Admin Insights');
    expect(analytics).toHaveTextContent('Total Listings');
    expect(analytics).toHaveTextContent('Listings With Flags');
    expect(analytics).toHaveTextContent('Average Conversion Rate');
    expect(analytics).toHaveTextContent('Open listing controls');
    expect(analytics).toHaveTextContent('Top performer:');

    const adminExtras = await screen.findByTestId('admin-marketplace-card-extras');
    expect(adminExtras).toHaveTextContent('Admin controls');
    expect(adminExtras).toHaveTextContent('Listing ID:');
    expect(adminExtras).toHaveTextContent('Status: Draft');
    expect(adminExtras).toHaveTextContent('Conversion Rate: 50%');
    expect(adminExtras).toHaveTextContent('managedBy: ops-team');

    const manageButton = within(adminExtras).getByRole('button', { name: /manage listing/i });
    const publishButton = within(adminExtras).getByRole('button', { name: /publish listing/i });
    const deleteButton = within(adminExtras).getByRole('button', { name: /delete listing/i });

    expect(manageButton).toBeEnabled();
    expect(publishButton).toBeEnabled();
    expect(deleteButton).toBeEnabled();

    await user.click(manageButton);
    await user.click(publishButton);
    await user.click(deleteButton);

    expect(manageMarketplaceListing).toHaveBeenCalledWith('1');
    expect(publishMarketplaceListing).toHaveBeenCalledWith('1');
    expect(deleteMarketplaceListing).toHaveBeenCalledWith('1');

    const card = await screen.findByTestId('marketplace-card-1');
    expect(card).toHaveTextContent('Premium Event Template');
    expect(card).toHaveTextContent('Studio Omega');

    expect(listMarketplace).toHaveBeenCalledTimes(1);
    expect(listMarketplace.mock.calls[0][0]).toEqual({
      role: 'admin',
      category: undefined,
      search: undefined,
    });
  });

  it('disables the publish control when a listing is already live', async () => {
    const publishMarketplaceListing = jest.fn();
    const adminListings = [
      {
        id: '42',
        title: 'Live Event Template',
        designer: { displayName: 'Studio Delta' },
        conversionRate: 0.72,
        flags: {},
        status: 'published',
        published: true,
      },
    ];
    const { listMarketplace } = mockAuth({
      role: 'admin',
      listings: adminListings,
      apiOverrides: { publishMarketplaceListing },
    });

    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    const extras = await screen.findByTestId('admin-marketplace-card-extras');
    const publishButton = within(extras).getByRole('button', { name: /published/i });

    expect(publishButton).toBeDisabled();
    expect(publishMarketplaceListing).not.toHaveBeenCalled();

    await waitFor(() => expect(listMarketplace).toHaveBeenCalledTimes(1));
  });

  it('shows a My Designs tab for admins and requests ownership-aware listings when selected', async () => {
    const user = userEvent.setup();
    const { listMarketplace } = mockAuth({ role: 'admin', user: { id: '42-admin' }, listings: [] });

    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    const myDesignsTab = await screen.findByRole('tab', { name: /my designs/i });
    expect(myDesignsTab).toBeInTheDocument();
    expect(myDesignsTab).toHaveAttribute('aria-selected', 'false');

    await waitFor(() => expect(listMarketplace).toHaveBeenCalledTimes(1));

    await user.click(myDesignsTab);

    await waitFor(() => expect(listMarketplace).toHaveBeenCalledTimes(2));
    expect(listMarketplace.mock.calls[1][0]).toEqual({
      role: 'admin',
      category: undefined,
      search: undefined,
      mine: true,
      ownerId: '42-admin',
    });
    expect(myDesignsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('does not show the My Designs tab for non-admin users', async () => {
    const { listMarketplace } = mockAuth({ role: 'consumer', listings: [] });

    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    await waitFor(() => expect(listMarketplace).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('tab', { name: /my designs/i })).not.toBeInTheDocument();
  });
});
