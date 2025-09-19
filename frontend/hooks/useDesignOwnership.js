import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';
import useAuth from './useAuth.js';

function normalizeDesignList(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.designs)) return response.designs;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.results)) return response.results;
  return [];
}

function normalizeOwnershipEntry(entry) {
  if (entry === null || entry === undefined) {
    return null;
  }

  if (typeof entry === 'string' || typeof entry === 'number') {
    const id = typeof entry === 'string' ? entry : String(entry);
    return { id, owned: true };
  }

  if (typeof entry !== 'object') {
    return null;
  }

  const rawId = entry.id ?? entry.designId ?? entry.token ?? entry.slug ?? entry.uuid ?? null;
  if (rawId === null || rawId === undefined) {
    return null;
  }

  const id = typeof rawId === 'string' ? rawId : String(rawId);
  const owned = entry.owned !== undefined ? Boolean(entry.owned) : true;

  return {
    ...entry,
    id,
    owned,
  };
}

export default function useDesignOwnership() {
  const {
    designOwnership = {},
    setCurrentDesignId,
    setDesignOwnershipLoading,
    setDesignOwnershipError,
    setDesignOwnershipEntries,
    clearDesignOwnershipEntry,
    resetDesignOwnership: resetDesignOwnershipState,
  } = useAppState();

  const auth = useAuth();
  const api = auth?.api;

  const currentDesignId = designOwnership.currentDesignId ?? null;
  const ownershipByDesignId = designOwnership.ownershipByDesignId ?? {};
  const loading = Boolean(designOwnership.loading);
  const error = designOwnership.error ?? null;

  const isDesignOwned = useCallback(
    (designId) => {
      const resolvedId = designId ?? currentDesignId;
      if (resolvedId === null || resolvedId === undefined) {
        return false;
      }
      const id = typeof resolvedId === 'string' ? resolvedId : String(resolvedId);
      const entry = ownershipByDesignId[id];
      if (!entry) {
        return false;
      }
      if (typeof entry === 'boolean') {
        return entry;
      }
      if (typeof entry.owned === 'boolean') {
        return entry.owned;
      }
      return true;
    },
    [currentDesignId, ownershipByDesignId]
  );

  const getOwnershipEntry = useCallback(
    (designId) => {
      const resolvedId = designId ?? currentDesignId;
      if (resolvedId === null || resolvedId === undefined) {
        return null;
      }
      const id = typeof resolvedId === 'string' ? resolvedId : String(resolvedId);
      return ownershipByDesignId[id] ?? null;
    },
    [currentDesignId, ownershipByDesignId]
  );

  const attemptedInitialLoadRef = useRef(false);

  const refreshOwnership = useCallback(async () => {
    attemptedInitialLoadRef.current = true;
    if (!api || typeof api.getUserDesigns !== 'function') {
      setDesignOwnershipEntries([], { replace: true });
      return [];
    }
    setDesignOwnershipLoading(true);
    setDesignOwnershipError(null);

    try {
      const response = await api.getUserDesigns();
      const designs = normalizeDesignList(response);
      const entries = designs.map(normalizeOwnershipEntry).filter(Boolean);
      setDesignOwnershipEntries(entries, { replace: true });
      return entries;
    } catch (err) {
      setDesignOwnershipError(err);
      setDesignOwnershipEntries([], { replace: true });
      throw err;
    } finally {
      setDesignOwnershipLoading(false);
    }
  }, [api, setDesignOwnershipEntries, setDesignOwnershipError, setDesignOwnershipLoading]);

  const ensureOwnership = useCallback(
    async (designId) => {
      const targetId = designId ?? currentDesignId;
      if (targetId === null || targetId === undefined) {
        return false;
      }
      if (isDesignOwned(targetId)) {
        return true;
      }
      try {
        const entries = await refreshOwnership();
        return entries.some((entry) => entry.id === (typeof targetId === 'string' ? targetId : String(targetId)) && entry.owned);
      } catch (_) {
        return false;
      }
    },
    [currentDesignId, isDesignOwned, refreshOwnership]
  );

  const markDesignOwned = useCallback(
    (designId, details = {}) => {
      const targetId = designId ?? currentDesignId;
      if (targetId === null || targetId === undefined) {
        return null;
      }
      const id = typeof targetId === 'string' ? targetId : String(targetId);
      const entry = normalizeOwnershipEntry({ id, owned: true, ...details });
      if (!entry) return null;
      setDesignOwnershipEntries([entry], { replace: false });
      return entry;
    },
    [currentDesignId, setDesignOwnershipEntries]
  );

  const clearDesignOwnership = useCallback(
    (designId) => {
      const targetId = designId ?? currentDesignId;
      if (targetId === null || targetId === undefined) {
        return;
      }
      const id = typeof targetId === 'string' ? targetId : String(targetId);
      clearDesignOwnershipEntry(id);
    },
    [clearDesignOwnershipEntry, currentDesignId]
  );

  const wasAuthenticatedRef = useRef(Boolean(auth?.isAuthenticated));

  const resetDesignOwnership = useCallback(() => {
    attemptedInitialLoadRef.current = false;
    const hasEntries = Object.keys(ownershipByDesignId).length > 0;
    const hasActiveDesign = currentDesignId !== null && currentDesignId !== undefined;
    const hasError = Boolean(error);
    if (!hasEntries && !hasActiveDesign && !loading && !hasError) {
      return;
    }
    resetDesignOwnershipState();
  }, [currentDesignId, error, loading, ownershipByDesignId, resetDesignOwnershipState]);

  useEffect(() => {
    const isAuthenticated = Boolean(auth?.isAuthenticated);

    if (!isAuthenticated) {
      const hasEntries = Object.keys(ownershipByDesignId).length > 0;
      const hasError = Boolean(error);
      const shouldReset =
        wasAuthenticatedRef.current ||
        hasEntries ||
        hasError ||
        loading;
      if (shouldReset) {
        resetDesignOwnership();
      }
      wasAuthenticatedRef.current = false;
      attemptedInitialLoadRef.current = false;
      return;
    }

    wasAuthenticatedRef.current = true;

    if (loading) {
      return;
    }

    const hasEntries = Object.keys(ownershipByDesignId).length > 0;
    if (!hasEntries && !attemptedInitialLoadRef.current) {
      attemptedInitialLoadRef.current = true;
      refreshOwnership().catch(() => {});
    }
  }, [
    auth?.isAuthenticated,
    currentDesignId,
    error,
    loading,
    ownershipByDesignId,
    refreshOwnership,
    resetDesignOwnership,
  ]);

  const value = useMemo(
    () => ({
      currentDesignId,
      ownershipByDesignId,
      loading,
      error,
      isDesignOwned,
      getOwnershipEntry,
      setCurrentDesignId,
      refreshOwnership,
      ensureOwnership,
      markDesignOwned,
      clearDesignOwnership,
      resetDesignOwnership,
    }),
    [
      clearDesignOwnership,
      currentDesignId,
      error,
      getOwnershipEntry,
      isDesignOwned,
      loading,
      markDesignOwned,
      ownershipByDesignId,
      refreshOwnership,
      resetDesignOwnership,
      setCurrentDesignId,
      ensureOwnership,
    ]
  );

  return value;
}
