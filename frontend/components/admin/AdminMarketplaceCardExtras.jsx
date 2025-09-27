function normalizeFlagEntries(flagEntries) {
  if (!Array.isArray(flagEntries)) {
    return [];
  }
  return flagEntries.filter((entry) => Array.isArray(entry) && entry.length >= 2);
}

function normalizeConversionLabel(label) {
  if (typeof label !== 'string') {
    return null;
  }
  const trimmed = label.trim();
  return trimmed ? trimmed : null;
}

function normalizeListingId(listingId) {
  if (listingId === undefined || listingId === null) {
    return null;
  }

  if (typeof listingId === 'string') {
    const trimmed = listingId.trim();
    return trimmed ? trimmed : null;
  }

  try {
    const asString = String(listingId);
    return asString.trim() ? asString : null;
  } catch (error) {
    return null;
  }
}

function hasCallable(fn) {
  return typeof fn === 'function';
}

export default function AdminMarketplaceCardExtras({
  listingId,
  flagEntries,
  conversionRateLabel,
  isPublished = false,
  onManage,
  onPublish,
  onDelete,
  onEdit,
  onDuplicate,
  onArchive,
  onViewAnalytics,
  listing = {},
}) {
  const normalizedFlags = normalizeFlagEntries(flagEntries);
  const normalizedConversion = normalizeConversionLabel(conversionRateLabel);
  const normalizedListingId = normalizeListingId(listingId);
  const hasFlags = normalizedFlags.length > 0;

  const canManage = Boolean(normalizedListingId && hasCallable(onManage));
  const canPublish = Boolean(normalizedListingId && hasCallable(onPublish) && !isPublished);
  const canEdit = Boolean(normalizedListingId && hasCallable(onEdit));
  const canDuplicate = Boolean(normalizedListingId && hasCallable(onDuplicate));
  const canArchive = Boolean(normalizedListingId && hasCallable(onArchive));
  const canViewAnalytics = Boolean(normalizedListingId && hasCallable(onViewAnalytics));
  const canDelete = Boolean(normalizedListingId && hasCallable(onDelete));

  const publishDisabled = !canPublish;
  const publishButtonLabel = isPublished ? 'Published' : 'Publish Listing';
  const statusLabel = isPublished ? 'Live' : 'Draft';

  const createdDate = listing?.createdAt ? new Date(listing.createdAt).toLocaleDateString() : 'Unknown';
  const lastModifiedDate = listing?.lastModified ? new Date(listing.lastModified).toLocaleDateString() : 'Unknown';

  const handleManageClick = () => {
    if (normalizedListingId && hasCallable(onManage)) {
      onManage(normalizedListingId);
    }
  };

  const handlePublishClick = () => {
    if (normalizedListingId && hasCallable(onPublish) && !isPublished) {
      onPublish(normalizedListingId);
    }
  };

  const handleDeleteClick = () => {
    if (normalizedListingId && hasCallable(onDelete)) {
      onDelete(normalizedListingId);
    }
  };

  const handleEditClick = () => {
    if (normalizedListingId && hasCallable(onEdit)) {
      onEdit(normalizedListingId);
    }
  };

  const handleDuplicateClick = () => {
    if (normalizedListingId && hasCallable(onDuplicate)) {
      onDuplicate(normalizedListingId);
    }
  };

  const handleArchiveClick = () => {
    if (normalizedListingId && hasCallable(onArchive)) {
      onArchive(normalizedListingId);
    }
  };

  const handleViewAnalyticsClick = () => {
    if (normalizedListingId && hasCallable(onViewAnalytics)) {
      onViewAnalytics(normalizedListingId);
    }
  };

  return (
    <div className="admin-marketplace-card-extras" data-testid="admin-marketplace-card-extras">
      <h4 className="admin-marketplace-card-heading">Admin controls</h4>

      <div className="admin-marketplace-metadata">
        <div className="metadata-row">
          <span>ID:</span> <code>{normalizedListingId ?? 'unassigned'}</code>
        </div>
        <div className="metadata-row">
          <span>Status:</span> <span className={`status-${statusLabel.toLowerCase()}`}>{statusLabel}</span>
        </div>
        <div className="metadata-row">
          <span>Created:</span> {createdDate}
        </div>
        <div className="metadata-row">
          <span>Modified:</span> {lastModifiedDate}
        </div>
        {listing?.views !== undefined && (
          <div className="metadata-row">
            <span>Views:</span> {listing.views || 0}
          </div>
        )}
        {listing?.downloads !== undefined && (
          <div className="metadata-row">
            <span>Downloads:</span> {listing.downloads || 0}
          </div>
        )}
      </div>
      <p className="marketplace-conversion">
        {normalizedConversion ? `Conversion Rate: ${normalizedConversion}` : 'Conversion analytics pending.'}
      </p>
      {hasFlags ? (
        <ul className="marketplace-flags">
          {normalizedFlags.map(([flagKey, flagValue]) => (
            <li key={flagKey}>{`${flagKey}: ${String(flagValue)}`}</li>
          ))}
        </ul>
      ) : (
        <p className="admin-marketplace-no-flags">No active flags for this listing.</p>
      )}
      <div className="admin-marketplace-actions">
        <div className="action-group primary-actions">
          {canEdit && (
            <button type="button" className="btn btn-primary btn-sm" onClick={handleEditClick}>
              ✏️ Edit
            </button>
          )}
          {canPublish && (
            <button
              type="button"
              className="btn btn-success btn-sm"
              disabled={publishDisabled}
              onClick={handlePublishClick}
            >
              🚀 {publishButtonLabel}
            </button>
          )}
          {canViewAnalytics && (
            <button type="button" className="btn btn-info btn-sm" onClick={handleViewAnalyticsClick}>
              📊 Analytics
            </button>
          )}
        </div>

        <div className="action-group secondary-actions">
          {canDuplicate && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleDuplicateClick}>
              📋 Duplicate
            </button>
          )}
          {canArchive && (
            <button type="button" className="btn btn-warning btn-sm" onClick={handleArchiveClick}>
              📁 Archive
            </button>
          )}
          {canManage && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleManageClick}>
              ⚙️ Manage
            </button>
          )}
        </div>

        <div className="action-group danger-actions">
          {canDelete && (
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteClick}>
              🗑️ Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
