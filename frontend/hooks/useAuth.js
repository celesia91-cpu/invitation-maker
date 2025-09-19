import { useCallback, useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';
import useApiClient from './useApiClient.js';

// Manages authentication state and actions using the API client
export default function useAuth() {
  const api = useApiClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setUserRole, resetUserRole } = useAppState();

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
    }
  }, [api, applyUserRole, resetUserRole]);

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
        }
        return res;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [api, applyUserRole, resetUserRole]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.logout();
      setUser(null);
      resetUserRole();
    } catch (e) {
      // surface warning but still clear local state
      setError(e);
      setUser(null);
      resetUserRole();
    } finally {
      setLoading(false);
    }
  }, [api, resetUserRole]);

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
      }
      return res?.user ?? null;
    } catch (e) {
      setError(e);
      resetUserRole();
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, applyUserRole, resetUserRole]);

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

