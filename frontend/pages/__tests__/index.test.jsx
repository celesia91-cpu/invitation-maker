import React, { useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import userEvent from '@testing-library/user-event';
import MarketplacePage from '../index.jsx';
import { AppStateProvider, MockAppStateProvider, useAppState } from '../../context/AppStateContext.jsx';
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

let previewModalProps;
let purchaseModalProps;

jest.mock('../../components/PreviewModal.jsx', () => ({
  __esModule: true,
  default: (props) => {
    previewModalProps = props;
    return null;
  },
}));

jest.mock('../../components/PurchaseModal.jsx', () => ({
  __esModule: true,
  default: (props) => {
    purchaseModalProps = props;
    return null;
  },
}));

const createAuthValue = (overrides = {}) => {
  const {
    api: apiOverride,
    isAuthenticated: isAuthenticatedOverride,
    user: userOverride,
    userRole: userRoleOverride,
    ...rest
  } = overrides;
  const isAuthenticated = isAuthenticatedOverride ?? false;
  const resolvedUser = userOverride || (userRoleOverride ? { role: userRoleOverride } : null);

  const defaultApi = {
    isAuthenticated: () => isAuthenticated,
    getUserDesigns: jest.fn().mockResolvedValue({ designs: [] }),
    getUser: jest.fn().mockReturnValue(resolvedUser),
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
    user: resolvedUser,
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

function InitialRoleSetter({ role, children }) {
  const { setUserRole } = useAppState();

  useEffect(() => {
    if (role) {
      setUserRole(role);
    }
  }, [role, setUserRole]);

  return children;
}

const renderPage = (
  routerOverrides,
  { userRole = 'guest', useMockProvider = true, providerValue } = {}
) => {
  const router = createMockRouter(routerOverrides);

  const ProviderComponent = useMockProvider ? MockAppStateProvider : AppStateProvider;
  const providerProps = useMockProvider
    ? { value: { userRole, ...(providerValue ?? {}) } }
    : {};

  const result = render(
    <RouterContext.Provider value={router}>
      <ProviderComponent {...providerProps}>
        {useMockProvider ? (
          <MarketplacePage />
        ) : (
          <InitialRoleSetter role={userRole}>
            <MarketplacePage />
          </InitialRoleSetter>
        )}
      </ProviderComponent>
    </RouterContext.Provider>
  );

  return { ...result, router };
};

describe('MarketplacePage', () => {
  beforeEach(() => {
    useModalFocusTrap.mockImplementation(() => ({ current: null }));
    previewModalProps = undefined;
    purchaseModalProps = undefined;
  });

  afterEach(() => {
    document.body.className = '';
    document.body.removeAttribute('class');
    jest.clearAllMocks();
  });

  it('auto-opens the auth modal when the user is not authenticated', async () => {
    useAuth.mockReturnValue(createAuthValue({ isAuthenticated: false }));

    renderPage(undefined, { userRole: 'creator', useMockProvider: false });

    const dialog = await screen.findByRole('dialog', { name: /welcome to invitation maker/i });
    expect(dialog).toBeInTheDocument();
  });

  it('keeps the auth modal closed when the user is authenticated', async () => {
    useAuth.mockReturnValue(createAuthValue({ isAuthenticated: true, userRole: 'creator' }));

    renderPage(undefined, { userRole: 'creator', useMockProvider: false });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /welcome to invitation maker/i })).not.toBeInTheDocument();
    });
  });

  it('navigates to the editor route when using the skip link', async () => {
    useAuth.mockReturnValue(createAuthValue({ isAuthenticated: true, userRole: 'creator' }));

    const user = userEvent.setup();
    const { router } = renderPage(undefined, { userRole: 'creator', useMockProvider: false });

    await screen.findByText(
      (content, element) =>
        element.classList?.contains('marketplace-role-summary') &&
        /Creator/i.test(element.textContent || '')
    );

    await user.click(screen.getByRole('link', { name: /skip to blank editor/i }));

    expect(router.push).toHaveBeenCalledWith('/editor');
  });

  it('opens the purchase flow for unowned designs and navigates after confirmation', async () => {
    useAuth.mockReturnValue(createAuthValue({ isAuthenticated: true, userRole: 'creator' }));

    const { router } = renderPage(undefined, { userRole: 'creator' });

    expect(typeof previewModalProps?.onUseDesign).toBe('function');

    await act(async () => {
      previewModalProps.onUseDesign?.({ designId: 'design-123', owned: false });
    });

    await waitFor(() => {
      expect(purchaseModalProps?.isOpen).toBe(true);
    });

    await act(async () => {
      purchaseModalProps.onConfirm?.({ designId: 'design-123', owned: true });
    });

    expect(router.push).toHaveBeenCalledWith('/editor/design-123');
  });

  it('navigates directly when an owned design is selected from the preview modal', async () => {
    useAuth.mockReturnValue(createAuthValue({ isAuthenticated: true, userRole: 'creator' }));

    const ownedId = 'demo-marketplace-design';
    const { router } = renderPage(undefined, {
      userRole: 'creator',
      providerValue: {
        designOwnership: {
          currentDesignId: ownedId,
          ownershipByDesignId: {
            [ownedId]: { owned: true },
          },
        },
      },
    });

    expect(typeof previewModalProps?.onUseDesign).toBe('function');

    await act(async () => {
      previewModalProps.onUseDesign?.({ designId: ownedId, owned: true });
    });

    expect(router.push).toHaveBeenCalledWith(`/editor/${ownedId}`);
    expect(purchaseModalProps?.isOpen).not.toBe(true);
  });
});
