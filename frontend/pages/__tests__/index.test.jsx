import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import userEvent from '@testing-library/user-event';
import MarketplacePage from '../index.jsx';
import { AppStateProvider } from '../../context/AppStateContext.jsx';
import useAuth from '../../hooks/useAuth.js';
import useModalFocusTrap from '../../hooks/useModalFocusTrap.js';
import { createMockRouter } from '../../test/utils/createMockRouter.js';

jest.mock('../../hooks/useAuth.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useModalFocusTrap.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const createAuthValue = (overrides = {}) => {
  const { api: apiOverride, isAuthenticated: isAuthenticatedOverride, ...rest } = overrides;
  const isAuthenticated = isAuthenticatedOverride ?? false;

  const defaultApi = {
    isAuthenticated: () => isAuthenticated,
    getUserDesigns: jest.fn().mockResolvedValue({ designs: [] }),
    uploadImage: jest.fn().mockResolvedValue({
      image: {
        id: 'demo-image',
        url: '/placeholder.jpg',
        thumbnailUrl: '/placeholder-thumb.jpg',
        width: 800,
        height: 450,
      },
    }),
  };

  return {
    user: null,
    loading: false,
    error: null,
    isAuthenticated,
    login: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
    ...rest,
    api: { ...defaultApi, ...(apiOverride ?? {}) },
  };
};

const renderPage = (routerOverrides) => {
  const router = createMockRouter(routerOverrides);

  return render(
    <RouterContext.Provider value={router}>
      <AppStateProvider>
        <MarketplacePage />
      </AppStateProvider>
    </RouterContext.Provider>
  );
};

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

    const confirmPurchaseButton = await screen.findByRole('button', { name: /confirm purchase/i });
    expect(confirmPurchaseButton).toBeInTheDocument();

    const cancelPurchaseButton = await screen.findByRole('button', { name: /cancel/i });
    expect(cancelPurchaseButton).toBeInTheDocument();

    await user.click(cancelPurchaseButton);

    await waitFor(() => {
      expect(screen.queryByText(/you need tokens to edit this design/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /confirm purchase/i })).not.toBeInTheDocument();
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

  it('uploads a background image and updates the canvas on success', async () => {
    const uploadResponse = {
      image: {
        id: 'uploaded',
        url: 'https://example.com/uploaded.png',
        thumbnailUrl: 'https://example.com/thumb.png',
        width: 1024,
        height: 576,
      },
    };
    let resolveUpload;
    const uploadImage = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        })
    );

    useAuth.mockReturnValue(
      createAuthValue({ isAuthenticated: true, api: { uploadImage } })
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('link', { name: /skip to blank editor/i }));

    const input = screen.getByLabelText(/upload background image/i);
    const file = new File(['content'], 'background.png', { type: 'image/png' });

    await user.upload(input, file);

    expect(uploadImage).toHaveBeenCalledWith(file);

    const uploadingButton = screen.getByRole('button', { name: /uploading/i });
    expect(uploadingButton).toBeDisabled();

    await screen.findByLabelText(/upload progress/i);

    await act(async () => {
      resolveUpload(uploadResponse);
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('background.png');
    });

    const image = await screen.findByAltText('Background');
    expect(image).toHaveAttribute('src', expect.stringContaining('https://example.com/uploaded.png'));
  });

  it('displays an error message when the upload fails', async () => {
    const uploadError = new Error('Network down');
    let rejectUpload;
    const uploadImage = jest.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectUpload = reject;
        })
    );

    useAuth.mockReturnValue(
      createAuthValue({ isAuthenticated: true, api: { uploadImage } })
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('link', { name: /skip to blank editor/i }));

    const input = screen.getByLabelText(/upload background image/i);
    const file = new File(['oops'], 'failure.png', { type: 'image/png' });

    await user.upload(input, file);

    expect(uploadImage).toHaveBeenCalledWith(file);

    try {
      await act(async () => {
        rejectUpload(uploadError);
      });
    } catch (_) {
      // expected rejection from the mocked upload
    }

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network down');
    });

    const placeholder = screen.getByText(/no image selected/i);
    expect(placeholder).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /upload background/i });
    expect(button).toBeEnabled();
  });
});
