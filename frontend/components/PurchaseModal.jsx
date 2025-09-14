export default function PurchaseModal({ isOpen, onConfirm, onCancel }) {
  return (
    <div
      id="purchaseModal"
      className={`purchase-modal${isOpen ? '' : ' hidden'}`}
      role="dialog"
      aria-modal="true"
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
