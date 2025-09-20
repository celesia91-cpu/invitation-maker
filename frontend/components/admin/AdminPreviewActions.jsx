function normalizeDesignId(designId) {
  if (designId === null || designId === undefined) {
    return null;
  }
  const id = typeof designId === 'string' ? designId.trim() : String(designId);
  return id || null;
}

export default function AdminPreviewActions({ designId, isOwned }) {
  const resolvedDesignId = normalizeDesignId(designId);

  return (
    <section
      className="admin-preview-actions"
      aria-label="Admin preview controls"
      data-testid="admin-preview-actions"
    >
      <h3 className="admin-preview-heading">Admin Controls</h3>
      <p className="admin-preview-metadata">
        Design ID: <code>{resolvedDesignId ?? 'unassigned'}</code>
      </p>
      <p className="admin-preview-status">
        {isOwned
          ? 'This design is already assigned to your managed library.'
          : 'This design is not yet assigned. You can feature or flag it below.'}
      </p>
      <div className="admin-preview-buttons">
        <button type="button" className="btn" disabled={!resolvedDesignId}>
          Mark as Featured
        </button>
        <button type="button" className="btn" disabled={!resolvedDesignId}>
          Flag for Review
        </button>
      </div>
    </section>
  );
}
