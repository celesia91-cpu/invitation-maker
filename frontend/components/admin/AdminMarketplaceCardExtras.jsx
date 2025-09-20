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
}) {
  const normalizedFlags = normalizeFlagEntries(flagEntries);
  const normalizedConversion = normalizeConversionLabel(conversionRateLabel);
  const normalizedListingId = normalizeListingId(listingId);
  const hasFlags = normalizedFlags.length > 0;

  const canManage = Boolean(normalizedListingId && hasCallable(onManage));
  const canPublish = Boolean(normalizedListingId && hasCallable(onPublish) && !isPublished);
  const publishDisabled = !canPublish;
  const canDelete = Boolean(normalizedListingId && hasCallable(onDelete));
  const publishButtonLabel = isPublished ? 'Published' : 'Publish Listing';
  const statusLabel = isPublished ? 'Live' : 'Draft';

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

  return (
    <div className="admin-marketplace-card-extras" data-testid="admin-marketplace-card-extras">
      <h4 className="admin-marketplace-card-heading">Admin controls</h4>
      <p className="admin-marketplace-metadata">
        Listing ID: <code>{normalizedListingId ?? 'unassigned'}</code>
      </p>
      <p className="admin-marketplace-status">Status: {statusLabel}</p>
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
        <button type="button" className="btn" disabled={!canManage} onClick={handleManageClick}>
          Manage Listing
        </button>
        <button
          type="button"
          className="btn"
          disabled={publishDisabled}
          onClick={handlePublishClick}
        >
          {publishButtonLabel}
        </button>
        <button type="button" className="btn" disabled={!canDelete} onClick={handleDeleteClick}>
          Delete Listing
        </button>
      </div>
    </div>
  );
}
