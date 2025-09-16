import useModalFocusTrap from '../hooks/useModalFocusTrap.js';

export default function PreviewModal({ isOpen, onClose, onUseDesign }) {
  const modalRef = useModalFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

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
        <div className="preview-actions">
          <button id="useDesignBtn" className="btn primary" onClick={onUseDesign}>Use This Design</button>
          <button id="favoriteDesignBtn" className="btn">Favorite</button>
        </div>
      </div>
    </div>
  );
}

