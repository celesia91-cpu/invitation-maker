import useModalFocusTrap from '../hooks/useModalFocusTrap.js';

export default function PurchaseModal({ isOpen, onConfirm, onCancel }) {
  const modalRef = useModalFocusTrap(isOpen, onCancel);

  if (!isOpen) return null;

  return (
    <div
      id="purchaseModal"
      className="purchase-modal"
      role="dialog"
      aria-modal="true"
      ref={modalRef}
    >
      <div className="purchase-content">
        <p id="purchaseMessage">You need tokens to edit this design.</p>
        <div className="purchase-actions">
          <button id="purchaseConfirm" className="btn primary" onClick={onConfirm}>Confirm</button>
          <button id="purchaseCancel" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
