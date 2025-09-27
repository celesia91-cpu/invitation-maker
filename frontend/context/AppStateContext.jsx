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

  // Design ownership
  designOwnership: {
    currentDesignId: null,
    ownershipByDesignId: {},
    loading: false,
    error: null,
  },

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

  // Music state
  musicState: {
    has: false,
    musicId: null,
    musicUrl: null,
    fileName: null,
    duration: null,
    volume: 0.5,
    loop: true,
  },

  fileUpload: {
    status: 'idle',
    progress: 0,
    error: null,
    lastUpload: null,
    fileName: null,
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
    case 'UPDATE_MUSIC_STATE':
      return { ...state, musicState: { ...state.musicState, ...(action.patch ?? {}) } };
    case 'START_FILE_UPLOAD': {
      const prevUpload = state.fileUpload || initialState.fileUpload;
      return {
        ...state,
        fileUpload: {
          status: 'uploading',
          progress: 0,
          error: null,
          lastUpload: prevUpload?.lastUpload ?? null,
          fileName: action.fileName ?? null,
        },
      };
    }
    case 'SET_FILE_UPLOAD_PROGRESS': {
      const prevUpload = state.fileUpload || initialState.fileUpload;
      const progressValue = Number.isFinite(action.progress)
        ? Math.min(100, Math.max(0, action.progress))
        : prevUpload.progress ?? 0;
      if (
        prevUpload.progress === progressValue &&
        prevUpload.status === 'uploading'
      ) {
        return state;
      }
      return {
        ...state,
        fileUpload: {
          ...prevUpload,
          progress: progressValue,
        },
      };
    }
    case 'COMPLETE_FILE_UPLOAD': {
      const prevUpload = state.fileUpload || initialState.fileUpload;
      const fileName = action.fileName ?? prevUpload.fileName ?? null;
      return {
        ...state,
        fileUpload: {
          status: 'success',
          progress: 100,
          error: null,
          lastUpload: {
            status: 'success',
            fileName,
            result: action.result ?? null,
          },
          fileName,
        },
      };
    }
    case 'FAIL_FILE_UPLOAD': {
      const prevUpload = state.fileUpload || initialState.fileUpload;
      const fileName = action.fileName ?? prevUpload.fileName ?? null;
      const error = action.error ?? null;
      const progressValue = Number.isFinite(action.progress)
        ? Math.min(100, Math.max(0, action.progress))
        : 0;
      return {
        ...state,
        fileUpload: {
          status: 'error',
          progress: progressValue,
          error,
          lastUpload: {
            status: 'error',
            fileName,
            error,
          },
          fileName,
        },
      };
    }
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
    case 'SET_CURRENT_DESIGN_ID': {
      const designOwnership = state.designOwnership || initialState.designOwnership;
      const nextId = typeof action.designId === 'string' ? action.designId : action.designId != null ? String(action.designId) : null;
      if (designOwnership.currentDesignId === nextId) {
        if (designOwnership === state.designOwnership) {
          return state;
        }
      }

      return {
        ...state,
        designOwnership: {
          ...designOwnership,
          ownershipByDesignId: { ...designOwnership.ownershipByDesignId },
          currentDesignId: nextId,
        },
      };
    }
    case 'SET_DESIGN_OWNERSHIP_LOADING': {
      const designOwnership = state.designOwnership || initialState.designOwnership;
      const loading = Boolean(action.loading);
      if (designOwnership.loading === loading && designOwnership === state.designOwnership) {
        return state;
      }

      return {
        ...state,
        designOwnership: {
          ...designOwnership,
          loading,
        },
      };
    }
    case 'SET_DESIGN_OWNERSHIP_ERROR': {
      const designOwnership = state.designOwnership || initialState.designOwnership;
      if (designOwnership.error === action.error && designOwnership === state.designOwnership) {
        return state;
      }

      return {
        ...state,
        designOwnership: {
          ...designOwnership,
          error: action.error ?? null,
        },
      };
    }
    case 'SET_DESIGN_OWNERSHIP_ENTRIES': {
      const designOwnership = state.designOwnership || initialState.designOwnership;
      const prevMap = designOwnership.ownershipByDesignId || {};
      const entries = Array.isArray(action.entries)
        ? action.entries
        : action.entries && typeof action.entries === 'object'
          ? Object.values(action.entries)
          : [];

      let hasChanges = Boolean(action.options?.replace);
      const nextMap = action.options?.replace ? {} : { ...prevMap };

      for (const entry of entries) {
        if (!entry) continue;
        const rawId = entry.id ?? entry.designId ?? entry.token ?? null;
        if (rawId === null || rawId === undefined) continue;
        const id = typeof rawId === 'string' ? rawId : String(rawId);
        const normalizedEntry = {
          owned: entry.owned !== undefined ? Boolean(entry.owned) : true,
          ...entry,
          id,
        };
        if (!hasChanges && prevMap[id] === normalizedEntry) {
          continue;
        }
        hasChanges = true;
        nextMap[id] = normalizedEntry;
      }

      if (!hasChanges && designOwnership === state.designOwnership) {
        return state;
      }

      return {
        ...state,
        designOwnership: {
          ...designOwnership,
          ownershipByDesignId: nextMap,
        },
      };
    }
    case 'CLEAR_DESIGN_OWNERSHIP_ENTRY': {
      const designOwnership = state.designOwnership || initialState.designOwnership;
      const prevMap = designOwnership.ownershipByDesignId || {};
      const rawId = action.designId ?? action.id ?? null;
      if (rawId === null || rawId === undefined) {
        return state;
      }
      const id = typeof rawId === 'string' ? rawId : String(rawId);
      if (!Object.prototype.hasOwnProperty.call(prevMap, id)) {
        return state;
      }
      const nextMap = { ...prevMap };
      delete nextMap[id];
      return {
        ...state,
        designOwnership: {
          ...designOwnership,
          ownershipByDesignId: nextMap,
        },
      };
    }
    case 'RESET_DESIGN_OWNERSHIP': {
      if (state.designOwnership === initialState.designOwnership) {
        return state;
      }
      return {
        ...state,
        designOwnership: {
          currentDesignId: initialState.designOwnership.currentDesignId,
          ownershipByDesignId: { ...initialState.designOwnership.ownershipByDesignId },
          loading: initialState.designOwnership.loading,
          error: initialState.designOwnership.error,
        },
      };
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

    // Music state
    updateMusicState: (patch) => dispatch({ type: 'UPDATE_MUSIC_STATE', patch }),

    // File upload helpers
    startFileUpload: (options) => {
      const fileName =
        typeof options === 'string' ? options : options?.fileName ?? null;
      dispatch({ type: 'START_FILE_UPLOAD', fileName });
    },
    setFileUploadProgress: (progress) =>
      dispatch({ type: 'SET_FILE_UPLOAD_PROGRESS', progress }),
    completeFileUpload: (options) =>
      dispatch({
        type: 'COMPLETE_FILE_UPLOAD',
        fileName:
          typeof options === 'string'
            ? options
            : options?.fileName ?? null,
        result:
          typeof options === 'object' && options !== null
            ? options.result ?? null
            : null,
      }),
    failFileUpload: (options) =>
      dispatch({
        type: 'FAIL_FILE_UPLOAD',
        fileName:
          typeof options === 'string'
            ? options
            : options?.fileName ?? null,
        error:
          typeof options === 'object' && options !== null
            ? options.error ?? null
            : null,
        progress:
          typeof options === 'object' && options !== null
            ? options.progress
            : undefined,
      }),

    // Text layers
    addTextLayer: (text, index) => dispatch({ type: 'ADD_TEXT_LAYER', text, index }),
    updateTextLayer: (layer, patch, index) => dispatch({ type: 'UPDATE_TEXT_LAYER', layer, patch, index }),
    removeTextLayer: (layer, index) => dispatch({ type: 'REMOVE_TEXT_LAYER', layer, index }),

    setTokenBalance: (value) => dispatch({ type: 'SET_TOKEN_BALANCE', value }),

    setUserRole: (role) => dispatch({ type: 'SET_USER_ROLE', role }),
    resetUserRole: () => dispatch({ type: 'SET_USER_ROLE', role: initialState.userRole }),

    pushNavigationHistory: (entry) => dispatch({ type: 'PUSH_NAVIGATION_HISTORY', entry }),
    resetNavigationHistory: () => dispatch({ type: 'RESET_NAVIGATION_HISTORY' }),

    // Design ownership helpers
    setCurrentDesignId: (designId) => dispatch({ type: 'SET_CURRENT_DESIGN_ID', designId }),
    setDesignOwnershipLoading: (loading) => dispatch({ type: 'SET_DESIGN_OWNERSHIP_LOADING', loading }),
    setDesignOwnershipError: (error) => dispatch({ type: 'SET_DESIGN_OWNERSHIP_ERROR', error }),
    setDesignOwnershipEntries: (entries, options) => dispatch({ type: 'SET_DESIGN_OWNERSHIP_ENTRIES', entries, options }),
    clearDesignOwnershipEntry: (designId) => dispatch({ type: 'CLEAR_DESIGN_OWNERSHIP_ENTRY', designId }),
    resetDesignOwnership: () => dispatch({ type: 'RESET_DESIGN_OWNERSHIP' }),
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
      designOwnership: {
        currentDesignId: initialState.designOwnership.currentDesignId,
        ownershipByDesignId: { ...initialState.designOwnership.ownershipByDesignId },
        loading: initialState.designOwnership.loading,
        error: initialState.designOwnership.error,
      },
      fileUpload: {
        ...initialState.fileUpload,
      },
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
