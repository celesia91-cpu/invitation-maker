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

export default function AdminMarketplaceCardExtras({ flagEntries, conversionRateLabel }) {
  const normalizedFlags = normalizeFlagEntries(flagEntries);
  const normalizedConversion = normalizeConversionLabel(conversionRateLabel);
  const hasFlags = normalizedFlags.length > 0;

  return (
    <div className="admin-marketplace-card-extras" data-testid="admin-marketplace-card-extras">
      <h4 className="admin-marketplace-card-heading">Admin insights</h4>
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
      <p className="admin-marketplace-guidance">
        Use the admin console to adjust availability or escalate moderation issues for this design.
      </p>
    </div>
  );
}
