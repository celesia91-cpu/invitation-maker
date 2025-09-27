import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

// Navigation transition states
export const TRANSITION_STATES = {
  IDLE: 'idle',
  TRANSITIONING: 'transitioning',
  CONFIRMING_UNSAVED: 'confirming_unsaved',
  ERROR: 'error',
};

// Navigation event types
export const NAV_EVENTS = {
  BEFORE_NAVIGATE: 'beforeNavigate',
  NAVIGATE_START: 'navigateStart',
  NAVIGATE_COMPLETE: 'navigateComplete',
  NAVIGATE_ERROR: 'navigateError',
  UNSAVED_CHANGES_WARNING: 'unsavedChangesWarning',
};

// Default navigation options
const DEFAULT_NAV_OPTIONS = {
  preserveState: true,
  checkUnsavedChanges: true,
  updateHistory: true,
  showLoadingState: true,
};

// Navigation history manager
export class NavigationHistoryManager {
  constructor() {
    this.listeners = new Map();
    this.state = {
      current: null,
      history: [],
      canGoBack: false,
      transitionState: TRANSITION_STATES.IDLE,
    };
  }

  // Add event listener
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  // Emit event
  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Navigation event handler error for ${event}:`, error);
        }
      });
    }
  }

  // Update current location
  updateCurrent(location) {
    const previous = this.state.current;
    this.state.current = location;

    if (previous && previous.href !== location.href) {
      this.addToHistory(previous);
    }

    this.state.canGoBack = this.state.history.length > 0;
  }

  // Add to navigation history
  addToHistory(location) {
    const MAX_HISTORY = 10;
    this.state.history.push({
      ...location,
      timestamp: Date.now(),
    });

    // Keep history size manageable
    if (this.state.history.length > MAX_HISTORY) {
      this.state.history = this.state.history.slice(-MAX_HISTORY);
    }
  }

  // Get previous location
  getPrevious() {
    return this.state.history[this.state.history.length - 1] || null;
  }

  // Get navigation context
  getContext() {
    return {
      ...this.state,
      previous: this.getPrevious(),
    };
  }

  // Set transition state
  setTransitionState(state) {
    if (this.state.transitionState !== state) {
      this.state.transitionState = state;
      this.emit(NAV_EVENTS.BEFORE_NAVIGATE, { transitionState: state });
    }
  }
}

// Global navigation manager instance
const globalNavManager = new NavigationHistoryManager();

// Hook for managing page navigation
export function usePageNavigation(options = {}) {
  const router = useRouter();
  const { pushNavigationHistory, resetNavigationHistory } = useAppState();
  const opts = { ...DEFAULT_NAV_OPTIONS, ...options };
  const unsavedChangesRef = useRef(false);
  const blockNavigationRef = useRef(false);

  // Navigation state
  const navContext = globalNavManager.getContext();

  // Update current location when route changes
  useEffect(() => {
    if (router.isReady) {
      const location = {
        href: router.asPath,
        pathname: router.pathname,
        query: router.query,
        label: formatPageLabel(router.pathname, router.query),
      };

      globalNavManager.updateCurrent(location);

      if (opts.updateHistory) {
        pushNavigationHistory({
          href: location.href,
          label: location.label,
        });
      }
    }
  }, [router.asPath, router.isReady, router.pathname, router.query, opts.updateHistory, pushNavigationHistory]);

  // Navigate with transition management
  const navigate = useCallback(async (href, navOptions = {}) => {
    const finalOptions = { ...opts, ...navOptions };

    try {
      // Emit before navigate event
      globalNavManager.emit(NAV_EVENTS.BEFORE_NAVIGATE, { href, options: finalOptions });

      // Check for unsaved changes
      if (finalOptions.checkUnsavedChanges && unsavedChangesRef.current) {
        globalNavManager.setTransitionState(TRANSITION_STATES.CONFIRMING_UNSAVED);

        const shouldContinue = await new Promise((resolve) => {
          globalNavManager.emit(NAV_EVENTS.UNSAVED_CHANGES_WARNING, {
            href,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });

        if (!shouldContinue) {
          globalNavManager.setTransitionState(TRANSITION_STATES.IDLE);
          return false;
        }
      }

      // Check if navigation is blocked
      if (blockNavigationRef.current) {
        return false;
      }

      globalNavManager.setTransitionState(TRANSITION_STATES.TRANSITIONING);
      globalNavManager.emit(NAV_EVENTS.NAVIGATE_START, { href });

      // Perform navigation
      await router.push(href);

      globalNavManager.setTransitionState(TRANSITION_STATES.IDLE);
      globalNavManager.emit(NAV_EVENTS.NAVIGATE_COMPLETE, { href });

      return true;
    } catch (error) {
      globalNavManager.setTransitionState(TRANSITION_STATES.ERROR);
      globalNavManager.emit(NAV_EVENTS.NAVIGATE_ERROR, { href, error });
      throw error;
    }
  }, [router, opts]);

  // Navigate back
  const goBack = useCallback(() => {
    const previous = globalNavManager.getPrevious();
    if (previous) {
      return navigate(previous.href, { checkUnsavedChanges: false });
    }
    return router.back();
  }, [navigate, router]);

  // Navigate to marketplace
  const goToMarketplace = useCallback((options = {}) => {
    return navigate('/', options);
  }, [navigate]);

  // Navigate to editor
  const goToEditor = useCallback((designId = null, options = {}) => {
    const href = designId ? `/editor/${encodeURIComponent(designId)}` : '/editor';
    return navigate(href, options);
  }, [navigate]);

  // Set unsaved changes state
  const setUnsavedChanges = useCallback((hasUnsaved) => {
    unsavedChangesRef.current = hasUnsaved;
  }, []);

  // Block navigation
  const setNavigationBlocked = useCallback((blocked) => {
    blockNavigationRef.current = blocked;
  }, []);

  // Clear navigation history
  const clearHistory = useCallback(() => {
    globalNavManager.state.history = [];
    globalNavManager.state.canGoBack = false;
    resetNavigationHistory();
  }, [resetNavigationHistory]);

  return {
    // Navigation methods
    navigate,
    goBack,
    goToMarketplace,
    goToEditor,

    // State management
    setUnsavedChanges,
    setNavigationBlocked,
    clearHistory,

    // Navigation context
    ...navContext,

    // Current route info
    currentPath: router.asPath,
    currentPathname: router.pathname,
    currentQuery: router.query,
    isReady: router.isReady,
  };
}

// Format page label from pathname and query
function formatPageLabel(pathname, query = {}) {
  if (pathname === '/') {
    return 'Marketplace';
  }

  if (pathname.startsWith('/editor')) {
    const token = query.token;
    if (token && Array.isArray(token) && token.length > 0) {
      return `Editor - ${token[0]}`;
    } else if (token) {
      return `Editor - ${token}`;
    }
    return 'Editor';
  }

  if (pathname.startsWith('/admin')) {
    return 'Admin Dashboard';
  }

  // Default formatting
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'Home';
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/[-_]/g, ' ');
}

// Navigation event hooks
export function useNavigationEvents() {
  const addListener = useCallback((event, callback) => {
    return globalNavManager.on(event, callback);
  }, []);

  const removeAllListeners = useCallback(() => {
    globalNavManager.listeners.clear();
  }, []);

  return {
    addListener,
    removeAllListeners,
    NAV_EVENTS,
    TRANSITION_STATES,
  };
}

// Export navigation manager for direct access
export { globalNavManager };