import { createContext, useContext, useMemo, useReducer } from 'react';

const AppStateContext = createContext(null);

// Initial shared state adapted from state-/image-/slide-manager patterns
export const initialState = {
  // Slides and selection
  slides: [], // [{ image: {src, ...}, layers: [{ text, left, top, fontSize, ... }], workSize: { w, h }, durationMs }]
  activeIndex: 0,

  // Playback
  playing: false,

  // Auth
  userRole: 'guest',

  // Image state (subset of image-manager.js)
  imgState: {
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
  },

  // Work area
  workSize: { w: 800, h: 450 },

  tokenBalance: 0,

  // Router
  navigationHistory: [],
};

const HOME_LABEL = 'Home';

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

export function formatNavigationLabel(href) {
  if (typeof href !== 'string' || !href.trim()) {
    return HOME_LABEL;
  }

  const path = href.split('#')[0].split('?')[0];
  if (!path || path === '/' || path.trim() === '') {
    return HOME_LABEL;
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) {
    return HOME_LABEL;
  }

  const lastSegment = safeDecodeURIComponent(segments[segments.length - 1]);
  const cleaned = lastSegment.replace(/[-_]+/g, ' ').trim();
  if (!cleaned) {
    return HOME_LABEL;
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeNavigationEntry(entry) {
  if (!entry || typeof entry.href !== 'string') {
    return null;
  }

  const href = entry.href.trim();
  if (!href) {
    return null;
  }

  const rawLabel = typeof entry.label === 'string' ? entry.label.trim() : '';
  const label = rawLabel || formatNavigationLabel(href);

  return { href, label };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_SLIDES':
      return { ...state, slides: action.slides ?? [] };
    case 'SET_ACTIVE_INDEX':
      return { ...state, activeIndex: Math.max(0, action.index | 0) };
    case 'SET_PLAYING':
      return { ...state, playing: !!action.playing };
    case 'SET_WORK_SIZE':
      return { ...state, workSize: { w: action.w | 0, h: action.h | 0 } };
    case 'UPDATE_IMG_STATE':
      return { ...state, imgState: { ...state.imgState, ...(action.patch ?? {}) } };
    case 'ADD_TEXT_LAYER': {
      const slides = state.slides.slice();
      const idx = action.index ?? state.activeIndex;
      const slide = slides[idx] ?? { image: null, layers: [], workSize: state.workSize, durationMs: 3000 };
      const layers = (slide.layers ?? []).concat({
        text: action.text ?? 'Text',
        left: 16,
        top: 16,
        fontSize: 24,
        fontFamily: 'system-ui',
        color: '#ffffff',
        _fadeInMs: 0,
        _fadeOutMs: 0,
      });
      slides[idx] = { ...slide, layers };
      return { ...state, slides };
    }
    case 'UPDATE_TEXT_LAYER': {
      const slides = state.slides.slice();
      const idx = action.index ?? state.activeIndex;
      const slide = slides[idx];
      if (!slide) return state;
      const layers = slide.layers.slice();
      if (!layers[action.layer]) return state;
      layers[action.layer] = { ...layers[action.layer], ...(action.patch ?? {}) };
      slides[idx] = { ...slide, layers };
      return { ...state, slides };
    }
    case 'REMOVE_TEXT_LAYER': {
      const slides = state.slides.slice();
      const idx = action.index ?? state.activeIndex;
      const slide = slides[idx];
      if (!slide) return state;
      const layers = slide.layers.filter((_, i) => i !== action.layer);
      slides[idx] = { ...slide, layers };
      return { ...state, slides };
    }
    case 'SET_TOKEN_BALANCE':
      return { ...state, tokenBalance: action.value | 0 };
    case 'SET_USER_ROLE': {
      const requestedRole = typeof action.role === 'string' ? action.role.trim() : '';
      const nextRole = requestedRole || initialState.userRole;
      if (state.userRole === nextRole) return state;
      return { ...state, userRole: nextRole };
    }
    case 'PUSH_NAVIGATION_HISTORY': {
      const entry = normalizeNavigationEntry(action.entry);
      if (!entry) {
        return state;
      }

      const history = state.navigationHistory ?? [];
      const lastEntry = history[history.length - 1];
      if (lastEntry && lastEntry.href === entry.href) {
        if (lastEntry.label === entry.label) {
          return state;
        }

        const nextHistory = history.slice();
        nextHistory[nextHistory.length - 1] = entry;
        return { ...state, navigationHistory: nextHistory };
      }

      return {
        ...state,
        navigationHistory: history.concat(entry),
      };
    }
    case 'RESET_NAVIGATION_HISTORY': {
      if (!state.navigationHistory || state.navigationHistory.length === 0) {
        return state;
      }

      return { ...state, navigationHistory: [] };
    }
    default:
      return state;
  }
}

export function createAppStateValue(state, dispatch) {
  return {
    // State
    ...state,

    // Slides
    setSlides: (slides) => dispatch({ type: 'SET_SLIDES', slides }),
    setActiveIndex: (index) => dispatch({ type: 'SET_ACTIVE_INDEX', index }),

    // Playback
    setPlaying: (playing) => dispatch({ type: 'SET_PLAYING', playing }),

    // Work area
    setWorkSize: (w, h) => dispatch({ type: 'SET_WORK_SIZE', w, h }),

    // Image state
    updateImgState: (patch) => dispatch({ type: 'UPDATE_IMG_STATE', patch }),

    // Text layers
    addTextLayer: (text, index) => dispatch({ type: 'ADD_TEXT_LAYER', text, index }),
    updateTextLayer: (layer, patch, index) => dispatch({ type: 'UPDATE_TEXT_LAYER', layer, patch, index }),
    removeTextLayer: (layer, index) => dispatch({ type: 'REMOVE_TEXT_LAYER', layer, index }),

    setTokenBalance: (value) => dispatch({ type: 'SET_TOKEN_BALANCE', value }),

    setUserRole: (role) => dispatch({ type: 'SET_USER_ROLE', role }),
    resetUserRole: () => dispatch({ type: 'SET_USER_ROLE', role: initialState.userRole }),

    pushNavigationHistory: (entry) => dispatch({ type: 'PUSH_NAVIGATION_HISTORY', entry }),
    resetNavigationHistory: () => dispatch({ type: 'RESET_NAVIGATION_HISTORY' }),
  };
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Action creators exposed to consumers
  const value = useMemo(() => createAppStateValue(state, dispatch), [state, dispatch]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}

// Mock provider for testing
export function MockAppStateProvider({ value, children }) {
  const fallbackValue = useMemo(() => {
    const baseState = {
      ...initialState,
      slides: Array.isArray(initialState.slides) ? [...initialState.slides] : [],
      imgState: { ...initialState.imgState },
      workSize: { ...initialState.workSize },
      navigationHistory: Array.isArray(initialState.navigationHistory)
        ? [...initialState.navigationHistory]
        : [],
    };

    return createAppStateValue(baseState, () => {});
  }, []);

  const mergedValue = useMemo(() => ({
    ...fallbackValue,
    ...(value ?? {}),
  }), [fallbackValue, value]);

  return (
    <AppStateContext.Provider value={mergedValue}>
      {children}
    </AppStateContext.Provider>
  );
}
