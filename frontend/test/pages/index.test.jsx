import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarketplacePage from '../index.jsx';
import { AppStateProvider } from '../../context/AppStateContext.jsx';
import useAuth from '../../hooks/useAuth.js';
import useModalFocusTrap from '../../hooks/useModalFocusTrap.js';

jest.mock('../../hooks/useAuth.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useModalFocusTrap.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const createAuthValue = (overrides = {}) => {
  const isAuthenticated = overrides.isAuthenticated ?? false;

  return {
    user: null,
    loading: false,
    error: null,
    isAuthenticated,
    login: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
    api: {
      isAuthenticated: () => isAuthenticated,
    },
    ...overrides,
  };
};

const renderPage = () =>
  render(
    <AppStateProvider>
      <MarketplacePage />
    </AppStateProvider>
  );

describe('MarketplacePage', () => {
  beforeEach(() => {
    useModalFocusTrap.mockImplementation(() => ({ current: null }));
  });

  afterEach(() => {
    document.body.className = '';
    document.body.removeAttribute('class');
    jest.clearAllMocks();
  });

  it('auto-opens the auth modal when the user is not authenticated', async () => {
    useAuth.mockReturnValue(createAuthValue({ isAuthenticated: false }));

    renderPage();

    const dialog = await screen.findByRole('dialog', { name: /welcome to invitation maker/i });
    expect(dialog).toBeInTheDocument();
  });

  it('keeps the auth modal closed when the user is authenticated', async () => {
    useAuth.mockReturnValue(createAuthValue({ isAuthenticated: true }));

    renderPage();

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /welcome to invitation maker/i })).not.toBeInTheDocument();
    });
  });

  it('switches to the editor view and toggles related UI when using the skip link', async () => {
    useAuth.mockReturnValue(createAuthValue({ isAuthenticated: true }));

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('link', { name: /skip to blank editor/i }));

    const marketplacePage = document.getElementById('marketplacePage');
    const editorPage = document.getElementById('editorPage');

    await waitFor(() => {
      expect(marketplacePage).toHaveClass('hidden');
      expect(editorPage).not.toHaveClass('hidden');
    });

    await waitFor(() => {
      expect(document.body).toHaveClass('panel-open');
    });

    const topbarToggle = screen.getByRole('button', { name: /collapse top bar/i });
    await user.click(topbarToggle);

    await waitFor(() => {
      expect(document.body).toHaveClass('topbar-hidden');
    });

    const previewButton = screen.getByRole('button', { name: 'Preview' });
    await user.click(previewButton);

    const useDesignButton = await screen.findByRole('button', { name: /use this design/i });
    expect(useDesignButton).toBeInTheDocument();

    await user.click(useDesignButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /use this design/i })).not.toBeInTheDocument();
    });

    const cancelPurchaseButton = await screen.findByRole('button', { name: /cancel/i });
    expect(cancelPurchaseButton).toBeInTheDocument();

    await user.click(cancelPurchaseButton);

    await waitFor(() => {
      expect(screen.queryByText(/you need tokens to edit this design/i)).not.toBeInTheDocument();
    });
  });

  it('updates the topbar toggle aria-expanded state and the panel-open body class', async () => {
    useAuth.mockReturnValue(createAuthValue({ isAuthenticated: true }));

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('link', { name: /skip to blank editor/i }));

    await waitFor(() => {
      expect(document.body).toHaveClass('panel-open');
    });

    const topbarToggle = screen.getByRole('button', { name: /collapse top bar/i });
    expect(topbarToggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(topbarToggle);

    await waitFor(() => {
      expect(topbarToggle).toHaveAttribute('aria-expanded', 'false');
      expect(document.body).toHaveClass('topbar-hidden');
    });

    const expandTopbarButton = screen.getByRole('button', { name: /expand top bar/i });
    await user.click(expandTopbarButton);

    await waitFor(() => {
      expect(expandTopbarButton).toHaveAttribute('aria-expanded', 'true');
      expect(document.body).not.toHaveClass('topbar-hidden');
    });

    const panelButton = screen.getByRole('button', { name: 'Panel' });
    expect(panelButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(panelButton);

    await waitFor(() => {
      expect(document.body).not.toHaveClass('panel-open');
      expect(panelButton).toHaveAttribute('aria-expanded', 'false');
    });

    await user.click(panelButton);

    await waitFor(() => {
      expect(document.body).toHaveClass('panel-open');
      expect(panelButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
