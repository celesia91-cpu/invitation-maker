import { useMemo } from 'react';

function hasActiveFlag(flags) {
  if (!flags || typeof flags !== 'object') {
    return false;
  }

  return Object.values(flags).some((value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    return value !== null && value !== undefined && value !== '';
  });
}

function parseConversionRate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return numeric;
}

function formatPercent(value) {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return `${Math.round(value * 100)}%`;
}

function getListingTitle(listing, index) {
  const rawTitle = typeof listing?.title === 'string' ? listing.title.trim() : '';
  if (rawTitle) {
    return rawTitle;
  }

  const rawId = listing?.id;
  if (rawId !== null && rawId !== undefined) {
    return `Design ${String(rawId)}`;
  }

  return `Design ${index + 1}`;
}

function getDesignerName(listing) {
  const rawName = listing?.designer?.displayName;
  if (typeof rawName !== 'string') {
    return '';
  }
  const trimmed = rawName.trim();
  return trimmed;
}

export default function AdminMarketplaceAnalytics({ listings, isLoading = false, errorMessage = '' }) {
  const metrics = useMemo(() => {
    const items = Array.isArray(listings) ? listings : [];

    let flaggedCount = 0;
    let totalConversion = 0;
    let conversionCount = 0;
    let topPerformer = null;

    items.forEach((listing, index) => {
      if (hasActiveFlag(listing?.flags)) {
        flaggedCount += 1;
      }

      const conversionRate = parseConversionRate(listing?.conversionRate);
      if (conversionRate !== null) {
        totalConversion += conversionRate;
        conversionCount += 1;

        if (!topPerformer || conversionRate > topPerformer.rate) {
          topPerformer = {
            rate: conversionRate,
            title: getListingTitle(listing, index),
            designer: getDesignerName(listing),
          };
        }
      }
    });

    return {
      totalListings: items.length,
      flaggedCount,
      averageConversionRate: conversionCount > 0 ? totalConversion / conversionCount : null,
      topPerformer,
    };
  }, [listings]);

  let bodyContent;

  if (isLoading) {
    bodyContent = (
      <p className="admin-marketplace-status" aria-live="polite">
        Loading admin analytics…
      </p>
    );
  } else if (errorMessage) {
    bodyContent = (
      <p className="admin-marketplace-error" role="alert">
        {errorMessage}
      </p>
    );
  } else if (metrics.totalListings === 0) {
    bodyContent = (
      <p className="admin-marketplace-empty">No analytics available yet. Listings will appear here once loaded.</p>
    );
  } else {
    const averageConversionLabel = formatPercent(metrics.averageConversionRate);
    const topPerformer = metrics.topPerformer;

    bodyContent = (
      <>
        <dl className="admin-marketplace-metrics">
          <div className="admin-marketplace-metric">
            <dt>Total Listings</dt>
            <dd>{metrics.totalListings}</dd>
          </div>
          <div className="admin-marketplace-metric">
            <dt>Listings With Flags</dt>
            <dd>{metrics.flaggedCount}</dd>
          </div>
          <div className="admin-marketplace-metric">
            <dt>Average Conversion Rate</dt>
            <dd>{averageConversionLabel ?? 'Not enough data'}</dd>
          </div>
        </dl>
        <p className="admin-marketplace-top-performer">
          {topPerformer ? (
            <>
              Top performer: <strong>{topPerformer.title}</strong>
              {topPerformer.designer ? ` by ${topPerformer.designer}` : ''} (
              {formatPercent(topPerformer.rate)})
            </>
          ) : (
            'Conversion metrics have not been collected for these listings yet.'
          )}
        </p>
        <button
          type="button"
          className="btn admin-marketplace-manage"
          aria-label="Open listing controls"
        >
          Open listing controls
        </button>
      </>
    );
  }

  return (
    <section
      className="admin-marketplace-analytics"
      aria-label="Admin marketplace analytics"
      data-testid="admin-marketplace-analytics"
    >
      <h3 className="admin-marketplace-heading">Admin Insights</h3>
      {bodyContent}
    </section>
  );
}
