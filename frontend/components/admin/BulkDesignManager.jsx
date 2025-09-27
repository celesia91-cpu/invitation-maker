import { useState, useCallback, useMemo } from 'react';

const BULK_ACTIONS = [
  { id: 'publish', label: 'Publish Selected', icon: '🚀', variant: 'success' },
  { id: 'unpublish', label: 'Unpublish Selected', icon: '📥', variant: 'warning' },
  { id: 'archive', label: 'Archive Selected', icon: '📁', variant: 'secondary' },
  { id: 'delete', label: 'Delete Selected', icon: '🗑️', variant: 'danger' },
  { id: 'duplicate', label: 'Duplicate Selected', icon: '📋', variant: 'info' },
  { id: 'export', label: 'Export Selected', icon: '💾', variant: 'primary' },
];

export default function BulkDesignManager({
  isOpen,
  onClose,
  listings = [],
  onBulkAction,
  userRole = 'admin',
}) {
  const [selectedListings, setSelectedListings] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');

  const filteredListings = useMemo(() => {
    let filtered = listings;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.title?.toLowerCase().includes(searchLower) ||
        listing.description?.toLowerCase().includes(searchLower) ||
        listing.id?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(listing => {
        const status = (listing.status || 'draft').toLowerCase();
        return status === filterStatus;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';

      if (sortBy === 'createdAt' || sortBy === 'lastModified') {
        aVal = new Date(aVal).getTime() || 0;
        bVal = new Date(bVal).getTime() || 0;
      } else if (sortBy === 'views' || sortBy === 'downloads') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (sortOrder === 'desc') {
        return bVal < aVal ? -1 : bVal > aVal ? 1 : 0;
      }
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });

    return filtered;
  }, [listings, searchTerm, filterStatus, sortBy, sortOrder]);

  const handleSelectListing = useCallback((listingId, checked) => {
    setSelectedListings(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(listingId);
      } else {
        next.delete(listingId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedListings(new Set(filteredListings.map(l => l.id)));
    } else {
      setSelectedListings(new Set());
    }
  }, [filteredListings]);

  const handleBulkAction = useCallback(async () => {
    if (!bulkAction || selectedListings.size === 0) return;

    const action = BULK_ACTIONS.find(a => a.id === bulkAction);
    if (!action) return;

    const confirmMessage = `Are you sure you want to ${action.label.toLowerCase()} ${selectedListings.size} design(s)?`;
    if (!window.confirm(confirmMessage)) return;

    setIsProcessing(true);

    try {
      const result = await onBulkAction({
        action: bulkAction,
        listingIds: Array.from(selectedListings),
        listings: filteredListings.filter(l => selectedListings.has(l.id)),
      });

      if (result.success !== false) {
        // Clear selection after successful action
        setSelectedListings(new Set());
        setBulkAction('');

        // Show success message
        alert(`Successfully ${action.label.toLowerCase()}: ${result.processedCount || selectedListings.size} item(s)`);
      } else {
        alert(`Error: ${result.error?.message || 'Failed to complete bulk action'}`);
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      alert('An error occurred while processing the bulk action');
    } finally {
      setIsProcessing(false);
    }
  }, [bulkAction, selectedListings, filteredListings, onBulkAction]);

  const selectedCount = selectedListings.size;
  const allSelected = filteredListings.length > 0 && selectedCount === filteredListings.length;
  const someSelected = selectedCount > 0 && !allSelected;

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bulk-manager-modal" role="dialog" aria-labelledby="bulk-manager-title">
        <header className="modal-header">
          <h2 id="bulk-manager-title">Bulk Design Management</h2>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="bulk-manager-toolbar">
          <div className="toolbar-section filters">
            <input
              type="text"
              placeholder="Search designs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              disabled={isProcessing}
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="status-filter"
              disabled={isProcessing}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="sort-select"
              disabled={isProcessing}
            >
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="lastModified-desc">Recently Modified</option>
              <option value="views-desc">Most Views</option>
              <option value="downloads-desc">Most Downloads</option>
            </select>
          </div>

          <div className="toolbar-section actions">
            <div className="selection-info">
              {selectedCount > 0 && (
                <span className="selection-count">
                  {selectedCount} of {filteredListings.length} selected
                </span>
              )}
            </div>

            {selectedCount > 0 && (
              <div className="bulk-actions">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="bulk-action-select"
                  disabled={isProcessing}
                >
                  <option value="">Choose action...</option>
                  {BULK_ACTIONS.map(action => (
                    <option key={action.id} value={action.id}>
                      {action.icon} {action.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBulkAction}
                  disabled={!bulkAction || isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Apply'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bulk-manager-content">
          {filteredListings.length === 0 ? (
            <div className="empty-state">
              <p>No designs found matching your filters.</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="list-header">
                <label className="select-all-checkbox">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={isProcessing}
                  />
                  Select All ({filteredListings.length})
                </label>
              </div>

              <div className="designs-list">
                {filteredListings.map(listing => {
                  const isSelected = selectedListings.has(listing.id);
                  const status = (listing.status || 'draft').toLowerCase();

                  return (
                    <div
                      key={listing.id}
                      className={`design-item ${isSelected ? 'selected' : ''}`}
                    >
                      <label className="design-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectListing(listing.id, e.target.checked)}
                          disabled={isProcessing}
                        />
                      </label>

                      <div className="design-thumbnail">
                        {listing.thumbnail ? (
                          <img src={listing.thumbnail} alt={listing.title} />
                        ) : (
                          <div className="placeholder-thumbnail">📄</div>
                        )}
                      </div>

                      <div className="design-info">
                        <h4 className="design-title">{listing.title || `Design ${listing.id}`}</h4>
                        <p className="design-id">ID: {listing.id}</p>
                        <div className="design-meta">
                          <span className={`status-badge ${status}`}>
                            {status === 'published' ? '✅' : status === 'draft' ? '📝' : status === 'archived' ? '📁' : '⏳'} {status}
                          </span>
                          <span>Created: {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : 'Unknown'}</span>
                          {listing.views !== undefined && <span>Views: {listing.views}</span>}
                          {listing.downloads !== undefined && <span>Downloads: {listing.downloads}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <footer className="modal-footer">
          <div className="footer-info">
            <span>Total: {listings.length} designs</span>
            <span>Filtered: {filteredListings.length} designs</span>
            <span>Selected: {selectedCount} designs</span>
          </div>
          <div className="footer-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isProcessing}
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}