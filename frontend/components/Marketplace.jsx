import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminMarketplaceAnalytics from './admin/AdminMarketplaceAnalytics.jsx';
import AdminMarketplaceCardExtras from './admin/AdminMarketplaceCardExtras.jsx';
import useAuth from '../hooks/useAuth.js';

const BASE_CATEGORY_OPTIONS = [
  { id: '', label: 'All' },
  { id: 'popular', label: 'Popular' },
  { id: 'recent', label: 'Recently Added' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recently-viewed', label: 'Recently Viewed' },
  { id: 'Birthday', label: 'Birthday' },
  { id: 'Wedding', label: 'Wedding' },
];

function toOwnershipSegment(value) {
  if (value === undefined || value === null) return '';
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return '';
  return normalized.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

function getAdminOwnershipCategoryId(user) {
  const segment =
    toOwnershipSegment(user?.id) ||
    toOwnershipSegment(user?.username) ||
    toOwnershipSegment(user?.email) ||
    'admin';
  return `owned-by-${segment}`;
}

const MARKETPLACE_ROLE_ALIASES = new Map([
  ['user', 'consumer'],
]);

function normalizeRole(role) {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (!normalized) {
    return 'consumer';
  }
  return MARKETPLACE_ROLE_ALIASES.get(normalized) || normalized;
}

function createCacheKey(role, category, search) {
  return [role || 'consumer', category || '', search || ''].join('::');
}

function toDesignerName(listing) {
  const name = listing?.designer?.displayName;
  return typeof name === 'string' ? name : '';
}

function extractFlagEntries(flags) {
  if (!flags || typeof flags !== 'object') return [];
  return Object.entries(flags).filter(([, value]) => {
    if (typeof value === 'boolean') return value;
    return value !== null && value !== undefined && value !== '';
  });
}

function formatConversionRate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return `${Math.round(numeric * 100)}%`;
}

function isListingPublished(listing) {
  if (!listing || typeof listing !== 'object') {
    return false;
  }

  if (typeof listing.published === 'boolean') {
    return listing.published;
  }

  if (typeof listing.isPublished === 'boolean') {
    return listing.isPublished;
  }

  const status = typeof listing.status === 'string' ? listing.status.trim().toLowerCase() : '';
  if (!status) {
    return false;
  }

  if (['published', 'active', 'live', 'available'].includes(status)) {
    return true;
  }

  if (['draft', 'pending', 'archived', 'disabled', 'inactive'].includes(status)) {
    return false;
  }

  return status.includes('publish');
}

export default function Marketplace({ isOpen, onSkipToEditor }) {
  const [activeCategory, setActiveCategory] = useState(BASE_CATEGORY_OPTIONS[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [listingsByKey, setListingsByKey] = useState({});
  const [loadingByKey, setLoadingByKey] = useState({});
  const [errorsByKey, setErrorsByKey] = useState({});
  const tabRefs = useRef([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const auth = useAuth();
  const user = auth?.user;
  const userId = user?.id ?? null;
  const api = auth?.api;

  const normalizedRole = normalizeRole(user?.role);
  const isAdmin = normalizedRole === 'admin';
  const adminOwnershipCategoryId = useMemo(
    () => getAdminOwnershipCategoryId(user || {}),
    [user]
  );
  const categoryOptions = useMemo(() => {
    if (!isAdmin) {
      return BASE_CATEGORY_OPTIONS;
    }
    return [
      ...BASE_CATEGORY_OPTIONS,
      { id: adminOwnershipCategoryId, label: 'My Designs' },
    ];
  }, [adminOwnershipCategoryId, isAdmin]);
  const trimmedSearch = searchTerm.trim();
  const searchKey = trimmedSearch.toLowerCase();
  const rawCategory = typeof activeCategory === 'string' ? activeCategory.trim() : '';
  const categoryKey = rawCategory.toLowerCase();
  const isOwnershipCategoryActive = isAdmin && rawCategory === adminOwnershipCategoryId;
  const cacheKey = createCacheKey(normalizedRole, categoryKey, searchKey);

  useEffect(() => {
    if (categoryOptions.length === 0) {
      return;
    }
    const hasActiveCategory = categoryOptions.some((option) => option.id === activeCategory);
    if (!hasActiveCategory) {
      setActiveCategory(categoryOptions[0].id);
    }
  }, [activeCategory, categoryOptions]);

  const currentResult = listingsByKey[cacheKey];
  const listings = Array.isArray(currentResult?.data) ? currentResult.data : [];
  const isLoading = Boolean(loadingByKey[cacheKey]);
  const currentError = errorsByKey[cacheKey] ?? null;
  const displayRole = normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);

  useEffect(() => {
    let cancelled = false;

    if (!isOpen) {
      return undefined;
    }

    if (!api || typeof api.listMarketplace !== 'function') {
      return undefined;
    }

    if (currentResult) {
      return undefined;
    }

    const requestKey = cacheKey;
    const requestCategory = isOwnershipCategoryActive ? undefined : categoryKey || undefined;
    const requestSearch = trimmedSearch || undefined;
    const requestOwnerId = isOwnershipCategoryActive && userId !== null ? String(userId) : undefined;

    setLoadingByKey((prev) => ({ ...prev, [requestKey]: true }));
    setErrorsByKey((prev) => {
      if (!prev[requestKey]) return prev;
      const next = { ...prev };
      delete next[requestKey];
      return next;
    });

    (async () => {
      try {
        const requestPayload = {
          role: normalizedRole,
          category: requestCategory,
          search: requestSearch,
        };

        if (isOwnershipCategoryActive) {
          if (requestOwnerId) {
            requestPayload.ownerId = requestOwnerId;
          }
          requestPayload.mine = true;
        }

        const response = await api.listMarketplace(requestPayload);

        if (cancelled || !isMountedRef.current) return;

        const normalizedResponse = {
          role: typeof response?.role === 'string' ? response.role : normalizedRole,
          data: Array.isArray(response?.data) ? response.data : [],
        };

        setListingsByKey((prev) => ({
          ...prev,
          [requestKey]: normalizedResponse,
        }));
      } catch (error) {
        if (cancelled || !isMountedRef.current) return;
        setErrorsByKey((prev) => ({
          ...prev,
          [requestKey]: error,
        }));
      } finally {
        if (!isMountedRef.current) {
          return;
        }
        setLoadingByKey((prev) => {
          if (!prev[requestKey]) return prev;
          const next = { ...prev };
          delete next[requestKey];
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    api,
    cacheKey,
    categoryKey,
    currentResult,
    isOpen,
    isOwnershipCategoryActive,
    normalizedRole,
    trimmedSearch,
    userId,
  ]);

  const handleKeyDown = (event, index) => {
    if (categoryOptions.length === 0) return;

    const { key } = event;

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      const direction = key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (index + direction + categoryOptions.length) % categoryOptions.length;
      const nextCategory = categoryOptions[nextIndex];
      setActiveCategory(nextCategory.id);
      tabRefs.current[nextIndex]?.focus();
    } else if (key === 'Home') {
      event.preventDefault();
      setActiveCategory(categoryOptions[0].id);
      tabRefs.current[0]?.focus();
    } else if (key === 'End') {
      event.preventDefault();
      const lastIndex = categoryOptions.length - 1;
      setActiveCategory(categoryOptions[lastIndex].id);
      tabRefs.current[lastIndex]?.focus();
    }
  };

  const resolvedErrorMessage = currentError
    ? typeof api?.handleError === 'function'
      ? api.handleError(currentError)
      : currentError.message || 'Unable to load marketplace.'
    : '';
  const adminErrorMessage = currentError ? resolvedErrorMessage : '';

  const handleAdminListingAction = useCallback(
    (action, listingId) => {
      if (!listingId) {
        return;
      }

      if (!api || typeof action !== 'string') {
        return;
      }

      const actionKey = action.trim().toLowerCase();
      if (!actionKey) {
        return;
      }

      const methodMap = {
        manage: 'manageMarketplaceListing',
        publish: 'publishMarketplaceListing',
        delete: 'deleteMarketplaceListing',
      };

      const directMethodName = methodMap[actionKey];
      const directHandler = directMethodName && typeof api[directMethodName] === 'function'
        ? api[directMethodName]
        : null;

      if (directHandler) {
        return directHandler.call(api, listingId);
      }

      if (typeof api.handleAdminMarketplaceAction === 'function') {
        return api.handleAdminMarketplaceAction({ action: actionKey, listingId });
      }

      if (typeof console !== 'undefined' && typeof console.info === 'function') {
        // eslint-disable-next-line no-console
        console.info(`[admin] ${actionKey} marketplace listing`, listingId);
      }

      return undefined;
    },
    [api]
  );

  const handleAdminManageListing = useCallback(
    (listingId) => handleAdminListingAction('manage', listingId),
    [handleAdminListingAction]
  );

  const handleAdminPublishListing = useCallback(
    (listingId) => handleAdminListingAction('publish', listingId),
    [handleAdminListingAction]
  );

  const handleAdminDeleteListing = useCallback(
    (listingId) => handleAdminListingAction('delete', listingId),
    [handleAdminListingAction]
  );

  return (
    <div id="marketplacePage" className={`page${isOpen ? '' : ' hidden'}`}>
      <h2>Marketplace</h2>
      <a
        href="#"
        id="skipToEditor"
        className="btn"
        style={{ margin: '16px 0', display: 'inline-block' }}
        onClick={(e) => { e.preventDefault(); onSkipToEditor?.(); }}
      >
        Skip to blank editor
      </a>
      <div className="marketplace-layout">
        <aside className="category-sidebar">
          <input
            type="text"
            id="designSearch"
            placeholder="Search designs"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <ul
            id="categoryTabs"
            className="category-tabs"
            role="tablist"
            aria-orientation="vertical"
          >
            {categoryOptions.map((category, index) => {
              const isActive = activeCategory === category.id;
              return (
                <li key={category.id || 'all'}>
                  <button
                    ref={(element) => { tabRefs.current[index] = element; }}
                    type="button"
                    className={`category-tab${isActive ? ' active' : ''}`}
                    data-category={category.id}
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveCategory(category.id)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                  >
                    {category.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <div id="designGrid" className="marketplace-grid">
          <div className="marketplace-role-summary" aria-live="polite">
            Viewing as <strong>{displayRole}</strong>
          </div>
          {isAdmin && (
            <AdminMarketplaceAnalytics
              listings={listings}
              isLoading={isLoading}
              errorMessage={adminErrorMessage}
            />
          )}
          {isLoading && (
            <div className="marketplace-status" role="status">
              Loading marketplace…
            </div>
          )}
          {currentError && (
            <div className="marketplace-error" role="alert">
              {resolvedErrorMessage}
            </div>
          )}
          {!isLoading && !currentError && listings.length === 0 && (
            <p className="marketplace-empty">No designs found for this selection.</p>
          )}
          {listings.map((listing, index) => {
            const normalizedListingId =
              listing?.id === undefined || listing?.id === null ? null : String(listing.id);
            const cardId = normalizedListingId ?? `item-${index}`;
            const designerName = toDesignerName(listing);
            const flagEntries = extractFlagEntries(listing?.flags);
            const conversionRateLabel = formatConversionRate(listing?.conversionRate);
            const listingIsPublished = isListingPublished(listing);
            const rawStatus = typeof listing?.status === 'string' ? listing.status.trim() : '';
            const normalizedStatus = rawStatus.toLowerCase();
            const statusLabel = normalizedStatus
              ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
              : null;
            const statusBadgeTestId = `marketplace-status-badge-${cardId}`;

            return (
              <article
                key={cardId}
                className="marketplace-card"
                data-testid={`marketplace-card-${cardId}`}
              >
                <h3 className="marketplace-card-title">
                  <span className="marketplace-card-title-text">
                    {listing?.title || `Design ${cardId}`}
                  </span>
                  {isAdmin && statusLabel ? (
                    <span
                      className={`marketplace-status-badge status-${normalizedStatus}`}
                      data-testid={statusBadgeTestId}
                      aria-label={`Status: ${statusLabel}`}
                    >
                      {statusLabel}
                    </span>
                  ) : null}
                </h3>
                {designerName ? (
                  <p className="marketplace-designer">{designerName}</p>
                ) : null}
                {!isAdmin && flagEntries.length > 0 && (
                  <ul className="marketplace-flags">
                    {flagEntries.map(([flagKey, flagValue]) => (
                      <li key={flagKey}>{`${flagKey}: ${String(flagValue)}`}</li>
                    ))}
                  </ul>
                )}
                {!isAdmin && conversionRateLabel !== null && (
                  <p className="marketplace-conversion">{`Conversion Rate: ${conversionRateLabel}`}</p>
                )}
                {isAdmin && (
                  <AdminMarketplaceCardExtras
                    listingId={normalizedListingId}
                    flagEntries={flagEntries}
                    conversionRateLabel={conversionRateLabel}
                    isPublished={listingIsPublished}
                    onManage={handleAdminManageListing}
                    onPublish={handleAdminPublishListing}
                    onDelete={handleAdminDeleteListing}
                  />
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
