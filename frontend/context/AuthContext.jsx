import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { APIClient } from '../services/api-client.js';
import { useAppState } from './AppStateContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children, apiClient = null }) {
  const api = useMemo(() => apiClient ?? new APIClient(), [apiClient]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const pendingUserRefresh = useRef(false);
  const lastAuthStateRef = useRef(null);
  const lastUserIdRef = useRef(null);
  const lastUserFingerprintRef = useRef(null);
  const initializedRef = useRef(false);

  const {
    setUserRole,
    resetUserRole,
    resetDesignOwnership,
    setCurrentDesignId,
  } = useAppState();

  const applyUserRole = useCallback(
    (nextUser) => {
      const role = typeof nextUser?.role === 'string' ? nextUser.role : null;
      if (role && role.trim()) {
        setUserRole(role);
      } else {
        resetUserRole();
      }
    },
    [resetUserRole, setUserRole]
  );

  const computeAuthState = useCallback(() => {
    try {
      return Boolean(api.isAuthenticated());
    } catch (_) {
      return false;
    }
  }, [api]);

  const ensureUserState = useCallback((nextUser) => {
    const nextId = nextUser && typeof nextUser === 'object' ? nextUser.id ?? nextUser.userId ?? null : null;
    const nextKey = nextId !== null && nextId !== undefined ? String(nextId) : null;
    const nextFingerprint = nextUser ? JSON.stringify(nextUser) : null;
    const prevKey = lastUserIdRef.current;
    const prevFingerprint = lastUserFingerprintRef.current;

    if (prevKey === nextKey && prevFingerprint === nextFingerprint) {
      return false;
    }

    lastUserIdRef.current = nextKey;
    lastUserFingerprintRef.current = nextFingerprint;

    if (nextUser) {
      setUser(nextUser);
      applyUserRole(nextUser);
    } else {
      setUser(null);
      resetUserRole();
    }

    return true;
  }, [applyUserRole, resetUserRole]);

  const login = useCallback(
    async ({ email, password, remember = false }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.login({ email, password, remember });
        if (res?.user) {
          ensureUserState(res.user);
        }

        const authenticated = computeAuthState();
        setIsAuthenticated(authenticated);

        if (!res?.user || !authenticated) {
          resetUserRole();
          resetDesignOwnership();
          setCurrentDesignId(null);
        }
        return res;
      } catch (e) {
        setError(e);
        setIsAuthenticated(computeAuthState());
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [
      api,
      computeAuthState,
      ensureUserState,
      resetDesignOwnership,
      resetUserRole,
      setCurrentDesignId,
    ]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.logout();
      setIsAuthenticated(computeAuthState());
      ensureUserState(null);
      resetDesignOwnership();
      setCurrentDesignId(null);
    } catch (e) {
      setError(e);
      ensureUserState(null);
      resetDesignOwnership();
      setCurrentDesignId(null);
      setIsAuthenticated(computeAuthState());
    } finally {
      setLoading(false);
    }
  }, [api, computeAuthState, ensureUserState, resetDesignOwnership, setCurrentDesignId]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCurrentUser();
      if (res?.user) {
        ensureUserState(res.user);
      }

      const authenticated = computeAuthState();
      setIsAuthenticated(authenticated);

      if (!res?.user || !authenticated) {
        resetUserRole();
        resetDesignOwnership();
        setCurrentDesignId(null);
      }
      return res?.user ?? null;
    } catch (e) {
      setError(e);
      ensureUserState(null);
      resetDesignOwnership();
      setCurrentDesignId(null);
      setIsAuthenticated(computeAuthState());
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    api,
    computeAuthState,
    ensureUserState,
    resetDesignOwnership,
    resetUserRole,
    setCurrentDesignId,
  ]);

  useEffect(() => {
    const updateAuthState = (nextState) => {
      if (lastAuthStateRef.current !== nextState) {
        lastAuthStateRef.current = nextState;
        setIsAuthenticated(nextState);
      }
    };

    const queueRefreshUser = () => {
      if (pendingUserRefresh.current) {
        return;
      }

      pendingUserRefresh.current = true;
      refreshUser()
        .catch(() => undefined)
        .finally(() => {
          pendingUserRefresh.current = false;
        });
    };

    const handleUnauthenticated = () => {
      const userChanged = ensureUserState(null);
      if (userChanged || lastAuthStateRef.current !== false) {
        resetDesignOwnership();
        setCurrentDesignId(null);
      }
      updateAuthState(false);
      pendingUserRefresh.current = false;
    };

    try {
      const authenticated = computeAuthState();
      if (authenticated) {
        updateAuthState(true);
        let sessionUser = null;
        try {
          sessionUser = api.getUser();
        } catch (_) {
          sessionUser = null;
        }

        if (sessionUser) {
          ensureUserState(sessionUser);
        } else {
          const cleared = ensureUserState(null);
          if (cleared) {
            resetDesignOwnership();
            setCurrentDesignId(null);
          }
          queueRefreshUser();
        }
      } else {
        handleUnauthenticated();
      }
    } catch (_) {
      handleUnauthenticated();
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      setIsInitialized(true);
    }
  }, [
    api,
    computeAuthState,
    ensureUserState,
    refreshUser,
    resetDesignOwnership,
    setCurrentDesignId,
  ]);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated,
      isInitialized,
      login,
      logout,
      refreshUser,
      api,
    }),
    [
      user,
      loading,
      error,
      isAuthenticated,
      isInitialized,
      login,
      logout,
      refreshUser,
      api,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
