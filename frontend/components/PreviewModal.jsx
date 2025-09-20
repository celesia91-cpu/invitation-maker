import { useEffect, useMemo } from 'react';
import AdminPreviewActions from './admin/AdminPreviewActions.jsx';
import { useAppState } from '../context/AppStateContext.jsx';
import useDesignOwnership from '../hooks/useDesignOwnership.js';
import useModalFocusTrap from '../hooks/useModalFocusTrap.js';

function normalizeRole(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

export default function PreviewModal({ isOpen, designId, onClose, onUseDesign }) {
  const modalRef = useModalFocusTrap(isOpen, onClose);
  const { userRole } = useAppState();
  const {
    currentDesignId,
    setCurrentDesignId,
    ensureOwnership,
    isDesignOwned,
    loading,
    error,
  } = useDesignOwnership();

  const resolvedDesignId = useMemo(() => {
    const rawId = designId !== undefined ? designId : currentDesignId;
    if (rawId === null || rawId === undefined) {
      return null;
    }
    return typeof rawId === 'string' ? rawId : String(rawId);
  }, [currentDesignId, designId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (resolvedDesignId) {
      setCurrentDesignId(resolvedDesignId);
      ensureOwnership(resolvedDesignId).catch(() => {});
    }
  }, [ensureOwnership, isOpen, resolvedDesignId, setCurrentDesignId]);

  if (!isOpen) return null;

  const owned = resolvedDesignId ? isDesignOwned(resolvedDesignId) : false;
  const normalizedRole = normalizeRole(userRole);
  const isAdmin = normalizedRole === 'admin';
  const buttonLabel = owned ? 'Edit This Design' : 'Use This Design';
  const statusMessage = (() => {
    if (loading) return 'Checking ownership status…';
    if (owned) return 'You already own this design.';
    if (error) return 'Unable to verify ownership. You may need to purchase this design.';
    return 'Preview this design before deciding to use it.';
  })();

  const handleUseDesign = () => {
    onUseDesign?.({ designId: resolvedDesignId, owned });
  };

  return (
    <div
      id="previewModal"
      className="preview-modal"
      role="dialog"
      aria-modal="true"
      ref={modalRef}
    >
      <div className="preview-content">
        <button id="previewClose" className="iconbtn preview-close" aria-label="Close preview" onClick={onClose}>×</button>
        <div id="previewSlides" className="preview-slides"></div>
        <p id="previewStatus" className="preview-status" aria-live="polite">{statusMessage}</p>
        <div className="preview-actions">
          <button
            id="useDesignBtn"
            className="btn primary"
            onClick={handleUseDesign}
            disabled={!resolvedDesignId}
          >
            {buttonLabel}
          </button>
          <button id="favoriteDesignBtn" className="btn">Favorite</button>
        </div>
        {isAdmin && (
          <AdminPreviewActions designId={resolvedDesignId} isOwned={owned} />
        )}
      </div>
    </div>
  );
}

