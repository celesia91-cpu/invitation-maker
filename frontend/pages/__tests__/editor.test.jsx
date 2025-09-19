import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../context/AppStateContext.jsx', () => {
  const React = require('react');
  const MockAppStateContext = React.createContext(null);

  const defaultImgState = {
    has: false,
    natW: 0,
    natH: 0,
    cx: 0,
    cy: 0,
    scale: 1,
    angle: 0,
    shearX: 0,
    shearY: 0,
    signX: 1,
    signY: 1,
    flip: false,
    backendImageId: null,
    backendImageUrl: null,
    backendThumbnailUrl: null,
  };

  const defaultWorkSize = { w: 800, h: 450 };

  function createInitialState(initialState = {}) {
    return {
      slides: [],
      activeIndex: 0,
      playing: false,
      userRole: 'guest',
      tokenBalance: 0,
      designOwnership: {
        currentDesignId: null,
        ownershipByDesignId: {},
        loading: false,
        error: null,
        ...(initialState.designOwnership ?? {}),
      },
      workSize: { ...defaultWorkSize, ...(initialState.workSize ?? {}) },
      imgState: { ...defaultImgState, ...(initialState.imgState ?? {}) },
      ...initialState,
    };
  }

  function MockAppStateProvider({ children, initialState, actionsRef }) {
    const [state, setState] = React.useState(() => createInitialState(initialState));

    const setSlidesRef = React.useRef();
    if (!setSlidesRef.current) {
      setSlidesRef.current = jest.fn((slides) => {
        setState((prev) => ({ ...prev, slides: slides ?? [] }));
      });
    }

    const setActiveIndexRef = React.useRef();
    if (!setActiveIndexRef.current) {
      setActiveIndexRef.current = jest.fn((index) => {
        setState((prev) => ({ ...prev, activeIndex: index ?? 0 }));
      });
    }

    const setWorkSizeRef = React.useRef();
    if (!setWorkSizeRef.current) {
      setWorkSizeRef.current = jest.fn((w, h) => {
        setState((prev) => ({ ...prev, workSize: { w, h } }));
      });
    }

    const updateImgStateRef = React.useRef();
    if (!updateImgStateRef.current) {
      updateImgStateRef.current = jest.fn((patch) => {
        setState((prev) => ({ ...prev, imgState: { ...prev.imgState, ...(patch ?? {}) } }));
      });
    }

    const setTokenBalanceRef = React.useRef();
    if (!setTokenBalanceRef.current) {
      setTokenBalanceRef.current = jest.fn((value) => {
        setState((prev) => ({ ...prev, tokenBalance: value ?? 0 }));
      });
    }

    const setUserRoleRef = React.useRef();
    if (!setUserRoleRef.current) {
      setUserRoleRef.current = jest.fn((role) => {
        setState((prev) => ({
          ...prev,
          userRole: typeof role === 'string' && role.trim() ? role : 'guest',
        }));
      });
    }

    const resetUserRoleRef = React.useRef();
    if (!resetUserRoleRef.current) {
      resetUserRoleRef.current = jest.fn(() => {
        setState((prev) => ({ ...prev, userRole: 'guest' }));
      });
    }

    const addTextLayerRef = React.useRef();
    if (!addTextLayerRef.current) {
      addTextLayerRef.current = jest.fn((text = 'Text', index) => {
        setState((prev) => {
          const targetIndex = index ?? prev.activeIndex ?? 0;
          if (targetIndex < 0) return prev;
          const slides = prev.slides.slice();
          const baseSlide = slides[targetIndex] ?? {
            id: `slide-${targetIndex}`,
            name: `Slide ${targetIndex + 1}`,
            image: null,
            layers: [],
            workSize: prev.workSize,
            durationMs: 3000,
          };
          const layers = [...(baseSlide.layers ?? []), {
            text,
            left: 16,
            top: 16,
            fontSize: 24,
            fontFamily: 'system-ui',
            color: '#ffffff',
          }];
          slides[targetIndex] = { ...baseSlide, layers };
          return { ...prev, slides };
        });
      });
    }

    const updateTextLayerRef = React.useRef();
    if (!updateTextLayerRef.current) {
      updateTextLayerRef.current = jest.fn((layerIndex, patch, index) => {
        setState((prev) => {
          const targetIndex = index ?? prev.activeIndex ?? 0;
          const slides = prev.slides.slice();
          const slide = slides[targetIndex];
          if (!slide || !slide.layers || !slide.layers[layerIndex]) return prev;
          const layers = slide.layers.slice();
          layers[layerIndex] = { ...layers[layerIndex], ...(patch ?? {}) };
          slides[targetIndex] = { ...slide, layers };
          return { ...prev, slides };
        });
      });
    }

    const removeTextLayerRef = React.useRef();
    if (!removeTextLayerRef.current) {
      removeTextLayerRef.current = jest.fn((layerIndex, index) => {
        setState((prev) => {
          const targetIndex = index ?? prev.activeIndex ?? 0;
          const slides = prev.slides.slice();
          const slide = slides[targetIndex];
          if (!slide || !slide.layers) return prev;
          const layers = slide.layers.filter((_, i) => i !== layerIndex);
          slides[targetIndex] = { ...slide, layers };
          return { ...prev, slides };
        });
      });
    }

    const value = React.useMemo(
      () => ({
        ...state,
        setSlides: setSlidesRef.current,
        setActiveIndex: setActiveIndexRef.current,
        setWorkSize: setWorkSizeRef.current,
        updateImgState: updateImgStateRef.current,
        setTokenBalance: setTokenBalanceRef.current,
        setUserRole: setUserRoleRef.current,
        resetUserRole: resetUserRoleRef.current,
        addTextLayer: addTextLayerRef.current,
        updateTextLayer: updateTextLayerRef.current,
        removeTextLayer: removeTextLayerRef.current,
      }),
      [state]
    );

    React.useEffect(() => {
      if (actionsRef) {
        actionsRef.current = {
          setSlides: setSlidesRef.current,
          setActiveIndex: setActiveIndexRef.current,
          setWorkSize: setWorkSizeRef.current,
          setTokenBalance: setTokenBalanceRef.current,
          setUserRole: setUserRoleRef.current,
          resetUserRole: resetUserRoleRef.current,
        };
      }
    }, [actionsRef]);

    return (
      <MockAppStateContext.Provider value={value}>{children}</MockAppStateContext.Provider>
    );
  }

  function useAppState() {
    const ctx = React.useContext(MockAppStateContext);
    if (!ctx) throw new Error('useAppState must be used within MockAppStateProvider');
    return ctx;
  }

  return {
    __esModule: true,
    useAppState,
    MockAppStateProvider,
  };
});

jest.mock('../../hooks/useAuth.js', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    login: jest.fn().mockResolvedValue({ balance: 42 }),
    logout: jest.fn(),
    refreshUser: jest.fn(),
    api: {},
  })),
}));

jest.mock('../../hooks/useDesignOwnership.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { useRouter } from 'next/router';
import Editor from '../editor/[[...token]].jsx';
import { MockAppStateProvider } from '../../context/AppStateContext.jsx';
import useDesignOwnership from '../../hooks/useDesignOwnership.js';

const createDesignOwnershipValue = (overrides = {}) => ({
  currentDesignId: null,
  setCurrentDesignId: jest.fn(),
  isDesignOwned: jest.fn().mockReturnValue(true),
  ensureOwnership: jest.fn().mockResolvedValue(true),
  loading: false,
  error: null,
  ...overrides,
});

describe('Editor page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ query: {} });
    useDesignOwnership.mockReset();
    useDesignOwnership.mockReturnValue(createDesignOwnershipValue());
  });

  function renderEditor({ initialState, actionsRef } = {}) {
    return render(
      <MockAppStateProvider initialState={initialState} actionsRef={actionsRef}>
        <Editor />
      </MockAppStateProvider>
    );
  }

  it('displays query params from the router in the UI', async () => {
    useRouter.mockReturnValue({ query: { token: 'abc123', view: 'preview' } });

    renderEditor({ initialState: { slides: [], activeIndex: 3, tokenBalance: 99 } });

    expect(await screen.findByText(/Token: abc123/i)).toBeInTheDocument();
    expect(screen.getByText(/View: preview/i)).toBeInTheDocument();
    expect(screen.getByText(/Token Balance: 99/i)).toBeInTheDocument();
    expect(screen.getByText(/Design Access:/i)).toBeInTheDocument();
  });

  it('seeds default slides and resets the active index when no slides exist', async () => {
    const actionsRef = { current: null };
    renderEditor({ initialState: { slides: [], activeIndex: 4 }, actionsRef });

    await waitFor(() => {
      expect(actionsRef.current?.setSlides).toBeDefined();
      expect(actionsRef.current?.setActiveIndex).toBeDefined();
      expect(actionsRef.current.setSlides).toHaveBeenCalled();
    });

    const seededSlides = actionsRef.current.setSlides.mock.calls.at(-1)[0];
    expect(seededSlides).toHaveLength(2);
    expect(seededSlides[0].name).toBe('Slide 1');
    expect(seededSlides[0].layers[0].text).toBe('First Slide');
    expect(seededSlides[1].layers[0].text).toBe('Second Slide');

    await waitFor(() => {
      expect(actionsRef.current.setActiveIndex).toHaveBeenCalledWith(0);
      expect(screen.getByDisplayValue('First Slide')).toBeInTheDocument();
    });
  });

  it('opens the auth modal from the login button and keeps nested panels visible', async () => {
    const user = userEvent.setup();
    const { container } = renderEditor({ initialState: { slides: [], activeIndex: 2 } });

    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(
      await screen.findByRole('dialog', { name: /welcome to invitation maker/i })
    ).toBeInTheDocument();

    expect(screen.getByText('Slides', { selector: 'strong' })).toBeInTheDocument();
    expect(container.querySelector('#work')).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Type text')).toBeInTheDocument();
    expect(container.querySelector('.drag-demo')).toBeInTheDocument();
  });

  it('locks the editor UI when the active design is not owned', async () => {
    const setCurrentDesignId = jest.fn();
    const ensureOwnership = jest.fn().mockResolvedValue(false);
    useDesignOwnership.mockReturnValue(
      createDesignOwnershipValue({
        currentDesignId: 'design-locked',
        setCurrentDesignId,
        isDesignOwned: jest.fn().mockReturnValue(false),
        ensureOwnership,
        loading: false,
      })
    );
    useRouter.mockReturnValue({ query: { token: ['design-locked'] } });

    renderEditor({ initialState: { slides: [], activeIndex: 0 } });

    expect(await screen.findByText(/editing is locked until you purchase this design/i)).toBeInTheDocument();
    expect(setCurrentDesignId).toHaveBeenCalledWith('design-locked');
    expect(ensureOwnership).toHaveBeenCalledWith('design-locked');

    const lockedRegions = document.querySelectorAll('[data-editing-locked="true"]');
    expect(lockedRegions.length).toBeGreaterThan(0);
    lockedRegions.forEach((element) => {
      expect(element).toHaveAttribute('aria-disabled', 'true');
    });
  });
});

