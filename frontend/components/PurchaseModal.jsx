import { useEffect, useMemo, useState } from 'react';
import useDesignOwnership from '../hooks/useDesignOwnership.js';
import useModalFocusTrap from '../hooks/useModalFocusTrap.js';

export default function PurchaseModal({ isOpen, designId, onConfirm, onCancel }) {
  const modalRef = useModalFocusTrap(isOpen, onCancel);
  const {
    currentDesignId,
    setCurrentDesignId,
    isDesignOwned,
    markDesignOwned,
    loading,
    error,
  } = useDesignOwnership();
  const [confirming, setConfirming] = useState(false);

  const resolvedDesignId = useMemo(() => {
    const rawId = designId !== undefined ? designId : currentDesignId;
    if (rawId === null || rawId === undefined) {
      return null;
    }
    return typeof rawId === 'string' ? rawId : String(rawId);
  }, [currentDesignId, designId]);

  useEffect(() => {
    if (!isOpen) {
      setConfirming(false);
      return;
    }
    if (resolvedDesignId && currentDesignId !== resolvedDesignId) {
      setCurrentDesignId(resolvedDesignId);
    }
  }, [isOpen, resolvedDesignId, currentDesignId, setCurrentDesignId]);

  if (!isOpen) return null;

  const owned = resolvedDesignId ? isDesignOwned(resolvedDesignId) : false;
  const baseMessage = owned
    ? 'You already own this design. Start editing when you are ready.'
    : 'You need tokens to edit this design.';
  const statusMessage = error && !owned
    ? 'We were unable to verify your ownership status. Please try again later.'
    : baseMessage;
  const confirmLabel = owned ? 'Start Editing' : 'Confirm Purchase';

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);

    try {
      let nextOwned = owned;
      if (!nextOwned && resolvedDesignId) {
        markDesignOwned(resolvedDesignId, { owned: true, purchasedAt: new Date().toISOString() });
        nextOwned = true;
      }
      onConfirm?.({ designId: resolvedDesignId, owned: nextOwned });
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = () => {
    if (confirming) return;
    onCancel?.();
  };

  return (
    <div
      id="purchaseModal"
      className="purchase-modal"
      role="dialog"
      aria-modal="true"
      ref={modalRef}
    >
      <div className="purchase-content">
        <p id="purchaseMessage" aria-live="polite">{statusMessage}</p>
        <div className="purchase-actions">
          <button
            id="purchaseConfirm"
            className="btn primary"
            onClick={handleConfirm}
            disabled={loading || confirming || !resolvedDesignId}
          >
            {confirmLabel}
          </button>
          <button id="purchaseCancel" className="btn" onClick={handleCancel} disabled={confirming}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
