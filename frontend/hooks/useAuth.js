import { useCallback, useEffect, useState } from 'react';
import useApiClient from './useApiClient.js';

// Manages authentication state and actions using the API client
export default function useAuth() {
  const api = useApiClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize from persisted session on mount
  useEffect(() => {
    try {
      if (api.isAuthenticated()) {
        const sessionUser = api.getUser();
        if (sessionUser) setUser(sessionUser);
      }
    } catch (_) {
      // ignore initialization errors
    }
  }, [api]);

  const login = useCallback(
    async ({ email, password, remember = false }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.login({ email, password, remember });
        if (res?.user) setUser(res.user);
        return res;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.logout();
      setUser(null);
    } catch (e) {
      // surface warning but still clear local state
      setError(e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCurrentUser();
      if (res?.user) setUser(res.user);
      return res?.user ?? null;
    } catch (e) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

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

