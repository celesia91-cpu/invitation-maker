import { useCallback, useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';
import useApiClient from './useApiClient.js';

// Manages authentication state and actions using the API client
export default function useAuth() {
  const api = useApiClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  // Initialize from persisted session on mount
  useEffect(() => {
    let appliedRole = false;
    try {
      if (api.isAuthenticated()) {
        const sessionUser = api.getUser();
        if (sessionUser) {
          setUser(sessionUser);
          applyUserRole(sessionUser);
          appliedRole = true;
        }
      }
    } catch (_) {
      // ignore initialization errors
    }

    if (!appliedRole) {
      resetUserRole();
      resetDesignOwnership();
      setCurrentDesignId(null);
    }
  }, [api, applyUserRole, resetDesignOwnership, resetUserRole, setCurrentDesignId]);

  const login = useCallback(
    async ({ email, password, remember = false }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.login({ email, password, remember });
        if (res?.user) {
          setUser(res.user);
          applyUserRole(res.user);
        } else {
          resetUserRole();
          resetDesignOwnership();
          setCurrentDesignId(null);
        }
        return res;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [api, applyUserRole, resetDesignOwnership, resetUserRole, setCurrentDesignId]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.logout();
      setUser(null);
      resetUserRole();
      resetDesignOwnership();
      setCurrentDesignId(null);
    } catch (e) {
      // surface warning but still clear local state
      setError(e);
      setUser(null);
      resetUserRole();
      resetDesignOwnership();
      setCurrentDesignId(null);
    } finally {
      setLoading(false);
    }
  }, [api, resetDesignOwnership, resetUserRole, setCurrentDesignId]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCurrentUser();
      if (res?.user) {
        setUser(res.user);
        applyUserRole(res.user);
      } else {
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
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, applyUserRole, resetDesignOwnership, resetUserRole, setCurrentDesignId]);

  return {
    // state
    user,
    loading,
    error,
    isAuthenticated: api.isAuthenticated(),

    // actions
    login,
    logout,
    refreshUser,

    // expose raw api in case needed by caller
    api,
  };
}

