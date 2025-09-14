export default function PreviewModal({ isOpen, onClose, onUseDesign }) {
  return (
    <div
      id="previewModal"
      className={`preview-modal${isOpen ? '' : ' hidden'}`}
      role="dialog"
      aria-modal="true"
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
