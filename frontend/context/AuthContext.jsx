import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    let appliedRole = false;
    try {
      const authenticated = computeAuthState();
      if (authenticated) {
        const sessionUser = api.getUser();
        if (sessionUser) {
          setUser(sessionUser);
          applyUserRole(sessionUser);
          appliedRole = true;
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (_) {
      setIsAuthenticated(false);
    }

    if (!appliedRole) {
      resetUserRole();
      resetDesignOwnership();
      setCurrentDesignId(null);
    }

    setIsInitialized(true);
  }, [
    api,
    applyUserRole,
    computeAuthState,
    resetDesignOwnership,
    resetUserRole,
    setCurrentDesignId,
  ]);

  const login = useCallback(
    async ({ email, password, remember = false }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.login({ email, password, remember });
        if (res?.user) {
          setUser(res.user);
          applyUserRole(res.user);
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
      applyUserRole,
      computeAuthState,
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
      setUser(null);
      resetUserRole();
      resetDesignOwnership();
      setCurrentDesignId(null);
    } catch (e) {
      setError(e);
      setUser(null);
      resetUserRole();
      resetDesignOwnership();
      setCurrentDesignId(null);
      setIsAuthenticated(computeAuthState());
    } finally {
      setLoading(false);
    }
  }, [api, computeAuthState, resetDesignOwnership, resetUserRole, setCurrentDesignId]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCurrentUser();
      if (res?.user) {
        setUser(res.user);
        applyUserRole(res.user);
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
      resetUserRole();
      resetDesignOwnership();
      setCurrentDesignId(null);
      setIsAuthenticated(computeAuthState());
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    api,
    applyUserRole,
    computeAuthState,
    resetDesignOwnership,
    resetUserRole,
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
