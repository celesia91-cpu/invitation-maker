import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminMarketplaceAnalytics from './admin/AdminMarketplaceAnalytics.jsx';
import AdminMarketplaceCardExtras from './admin/AdminMarketplaceCardExtras.jsx';
import BulkDesignManager from './admin/BulkDesignManager.jsx';
import FeatureErrorBoundary from './FeatureErrorBoundary.jsx';
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
  const [showBulkManager, setShowBulkManager] = useState(false);
  const tabRefs = useRef([]);
  const isMountedRef = useRef(true);
  const abortControllersRef = useRef(new Map());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel all pending requests
      const controllers = abortControllersRef.current;
      controllers.forEach((controller) => {
        controller.abort();
      });
      controllers.clear();
    };
  }, []);

  const auth = useAuth();
  const user = auth?.user;
  const userId = user?.id ?? null;
  const api = auth?.api;

  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const normalizedRole = normalizeRole(user?.role);
  const isAdmin = normalizedRole === 'admin';
  const adminOwnershipCategoryId = useMemo(
    () => getAdminOwnershipCategoryId(user || {}),
    [user]
  );
  const categoryOptions = useMemo(() => {
    const options = [...BASE_CATEGORY_OPTIONS];

    if (isAdmin) {
      // Add admin-specific categories
      options.push(
        { id: adminOwnershipCategoryId, label: 'My Designs' },
        { id: 'all-admin', label: 'All Designs (Admin View)' },
        { id: 'pending-review', label: 'Pending Review' },
        { id: 'draft', label: 'Draft Designs' }
      );
    }

    return options;
  }, [adminOwnershipCategoryId, isAdmin]);
  const trimmedSearch = searchTerm.trim();
  const searchKey = trimmedSearch.toLowerCase();
  const rawCategory = typeof activeCategory === 'string' ? activeCategory.trim() : '';
  const categoryKey = rawCategory.toLowerCase();
  const isOwnershipCategoryActive = isAdmin && rawCategory === adminOwnershipCategoryId;
  const isAdminCategoryActive = isAdmin && ['all-admin', 'pending-review', 'draft'].includes(rawCategory);
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
  const isRequestPending = Boolean(loadingByKey[cacheKey]);
  const listings = Array.isArray(currentResult?.data) ? currentResult.data : [];
  const isLoading = isRequestPending;
  const currentError = errorsByKey[cacheKey] ?? null;
  const displayRole = isAuthenticated
    ? normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)
    : 'Guest';

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    if (!isAuthenticated) {
      return undefined;
    }

    if (!api || typeof api.listMarketplace !== 'function') {
      return undefined;
    }

    if (currentResult) {
      return undefined;
    }

    if (isRequestPending) {
      return undefined;
    }

    const requestKey = cacheKey;

    // Determine request parameters based on category
    let requestCategory = undefined;
    let requestOwnerId = undefined;
    let requestStatus = undefined;
    let requestAdminView = false;

    if (isOwnershipCategoryActive) {
      // "My Designs" - filter by owner
      requestOwnerId = userId !== null ? String(userId) : undefined;
    } else if (isAdminCategoryActive) {
      // Admin-specific categories
      requestAdminView = true;
      switch (rawCategory) {
        case 'all-admin':
          // Show all designs with admin privileges
          break;
        case 'pending-review':
          requestStatus = 'pending-review';
          break;
        case 'draft':
          requestStatus = 'draft';
          break;
      }
    } else {
      // Regular categories
      requestCategory = categoryKey || undefined;
    }

    const requestSearch = trimmedSearch || undefined;

    // Cancel any existing request for this key
    const existingController = abortControllersRef.current.get(requestKey);
    if (existingController) {
      existingController.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllersRef.current.set(requestKey, abortController);

    setLoadingByKey((prev) => ({ ...prev, [requestKey]: true }));
    setErrorsByKey((prev) => {
      if (!prev[requestKey]) return prev;
      const next = { ...prev };
      delete next[requestKey];
      return next;
    });

    (async () => {
      try {
        // Check if aborted before starting
        if (abortController.signal.aborted) {
          return;
        }

        const requestPayload = {
          role: normalizedRole,
          category: requestCategory,
          search: requestSearch,
        };

        // Add ownership filter
        if (isOwnershipCategoryActive) {
          if (requestOwnerId) {
            requestPayload.ownerId = requestOwnerId;
          }
          requestPayload.mine = true;
        }

        // Add admin-specific parameters
        if (isAdminCategoryActive) {
          requestPayload.adminView = true;
          if (requestStatus) {
            requestPayload.status = requestStatus;
          }
        }

        const response = await api.listMarketplace(requestPayload);

        // Check if request was cancelled or component unmounted
        if (abortController.signal.aborted || !isMountedRef.current) {
          return;
        }

        const normalizedResponse = {
          role: typeof response?.role === 'string' ? response.role : normalizedRole,
          data: Array.isArray(response?.data) ? response.data : [],
        };

        setListingsByKey((prev) => ({
          ...prev,
          [requestKey]: normalizedResponse,
        }));
      } catch (error) {
        // Check if error is due to abort
        if (error.name === 'AbortError' || abortController.signal.aborted) {
          return;
        }

        if (!isMountedRef.current) return;

        setErrorsByKey((prev) => ({
          ...prev,
          [requestKey]: error,
        }));
      } finally {
        // Clean up abort controller
        abortControllersRef.current.delete(requestKey);

        if (!isMountedRef.current || abortController.signal.aborted) {
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

    // Cleanup function to cancel request if dependencies change
    return () => {
      const controllers = abortControllersRef.current;
      const controller = controllers.get(requestKey);
      if (controller) {
        controller.abort();
        controllers.delete(requestKey);
      }
    };
  }, [
    api,
    cacheKey,
    categoryKey,
    currentResult,
    isAuthenticated,
    isOpen,
    isOwnershipCategoryActive,
    isRequestPending,
    normalizedRole,
    trimmedSearch,
    userId,
    isAdminCategoryActive,
    rawCategory,
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const hasListings = Object.keys(listingsByKey).length > 0;
    const hasLoading = Object.keys(loadingByKey).length > 0;
    const hasErrors = Object.keys(errorsByKey).length > 0;
    if (!hasListings && !hasLoading && !hasErrors) {
      return;
    }

    setListingsByKey({});
    setLoadingByKey({});
    setErrorsByKey({});
  }, [errorsByKey, isAuthenticated, listingsByKey, loadingByKey]);

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
        edit: 'editMarketplaceListing',
        duplicate: 'duplicateMarketplaceListing',
        archive: 'archiveMarketplaceListing',
        viewAnalytics: 'viewMarketplaceAnalytics',
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

  const handleAdminEditListing = useCallback(
    (listingId) => handleAdminListingAction('edit', listingId),
    [handleAdminListingAction]
  );

  const handleAdminDuplicateListing = useCallback(
    (listingId) => handleAdminListingAction('duplicate', listingId),
    [handleAdminListingAction]
  );

  const handleAdminArchiveListing = useCallback(
    (listingId) => handleAdminListingAction('archive', listingId),
    [handleAdminListingAction]
  );

  const handleAdminViewAnalytics = useCallback(
    (listingId) => handleAdminListingAction('viewAnalytics', listingId),
    [handleAdminListingAction]
  );

  const handleBulkAction = useCallback(async (bulkActionData) => {
    if (typeof api?.handleBulkMarketplaceAction === 'function') {
      return await api.handleBulkMarketplaceAction(bulkActionData);
    }

    // Mock implementation for development
    // Debug info removed for production

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      processedCount: bulkActionData.listingIds.length,
      message: `Successfully processed ${bulkActionData.listingIds.length} designs`,
    };
  }, [api]);

  return (
    <FeatureErrorBoundary
      featureName="Marketplace"
      fallbackMessage="The marketplace is temporarily unavailable. Please try again or refresh the page."
      showReload={true}
    >
      <div id="marketplacePage" className={`page${isOpen ? '' : ' hidden'}`}>
      <h2>Marketplace</h2>
      <div className="marketplace-actions" style={{ margin: '16px 0' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSkipToEditor}
          style={{ marginRight: '12px' }}
        >
          🎨 Start Creating
        </button>
        <span className="marketplace-action-hint">
          Choose from templates, start blank, or continue recent work
        </span>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowBulkManager(true)}
            style={{ marginLeft: '12px' }}
          >
            ⚙️ Bulk Manage
          </button>
        )}
      </div>
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
              Loading marketplace...
            </div>
          )}
          {currentError && (
            <div className="marketplace-error" role="alert">
              {resolvedErrorMessage}
            </div>
          )}
          {!isAuthenticated && !isLoading && !currentError && (
            <p className="marketplace-status" role="status">
              Sign in to browse the marketplace.
            </p>
          )}
          {isAuthenticated && !isLoading && !currentError && listings.length === 0 && (
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

            // Enhanced status information
            const statusInfo = {
              label: statusLabel,
              isPending: ['pending', 'pending-review', 'under-review'].includes(normalizedStatus),
              isDraft: ['draft', 'unpublished'].includes(normalizedStatus),
              isLive: listingIsPublished,
              isArchived: ['archived', 'disabled', 'inactive'].includes(normalizedStatus),
            };

            const statusIcon = statusInfo.isLive ? '✅' : statusInfo.isDraft ? '📝' : statusInfo.isPending ? '⏳' : statusInfo.isArchived ? '📁' : '❓';

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
                  {(isAdmin || isOwnershipCategoryActive) && statusInfo.label ? (
                    <span
                      className={`marketplace-status-badge status-${normalizedStatus} ${
                        statusInfo.isLive ? 'status-live' : ''
                      } ${statusInfo.isDraft ? 'status-draft' : ''} ${
                        statusInfo.isPending ? 'status-pending' : ''
                      } ${statusInfo.isArchived ? 'status-archived' : ''}`}
                      data-testid={statusBadgeTestId}
                      aria-label={`Status: ${statusInfo.label}`}
                      title={`Design status: ${statusInfo.label}`}
                    >
                      <span className="status-icon" aria-hidden="true">{statusIcon}</span>
                      <span className="status-text">{statusInfo.label}</span>
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
                  <>
                    <div className="marketplace-card-quick-actions">
                      <button
                        type="button"
                        className="quick-action-btn edit-btn"
                        onClick={() => handleAdminManageListing(normalizedListingId)}
                        title="Edit design"
                        disabled={!normalizedListingId}
                      >
                        ✏️ Edit
                      </button>
                      {statusInfo.isDraft && (
                        <button
                          type="button"
                          className="quick-action-btn publish-btn"
                          onClick={() => handleAdminPublishListing(normalizedListingId)}
                          title="Publish design"
                          disabled={!normalizedListingId}
                        >
                          🚀 Publish
                        </button>
                      )}
                      <button
                        type="button"
                        className="quick-action-btn delete-btn"
                        onClick={() => handleAdminDeleteListing(normalizedListingId)}
                        title="Delete design"
                        disabled={!normalizedListingId}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                    <AdminMarketplaceCardExtras
                      listingId={normalizedListingId}
                      flagEntries={flagEntries}
                      conversionRateLabel={conversionRateLabel}
                      isPublished={listingIsPublished}
                      listing={listing}
                      onManage={handleAdminManageListing}
                      onPublish={handleAdminPublishListing}
                      onDelete={handleAdminDeleteListing}
                      onEdit={handleAdminEditListing}
                      onDuplicate={handleAdminDuplicateListing}
                      onArchive={handleAdminArchiveListing}
                      onViewAnalytics={handleAdminViewAnalytics}
                    />
                  </>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Bulk Design Manager Modal */}
      <BulkDesignManager
        isOpen={showBulkManager}
        onClose={() => setShowBulkManager(false)}
        listings={listings}
        onBulkAction={handleBulkAction}
        userRole={normalizedRole}
      />
      </div>
    </FeatureErrorBoundary>
  );
}
