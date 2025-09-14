export default function Topbar({ onPreviewClick, onShareClick, onTogglePanel, panelOpen }) {
  return (
    <header className="topbar" id="topbar">
      <div className="brand"> Celesia Animated Invitation</div>
      <div className="grow"></div>

      {/* editor controls hidden in viewer via .edit-only */}
      <button id="undoBtn" className="iconbtn edit-only mb-hide-when-collapsed" aria-label="Undo" disabled>
        Undo
      </button>
      <button id="redoBtn" className="iconbtn edit-only mb-hide-when-collapsed" aria-label="Redo" disabled>
        Redo
      </button>

      <button id="prevSlideBtn" className="iconbtn edit-only mb-hide-when-collapsed" aria-label="Previous slide">
        ◀
      </button>
      <span id="slideLabel" className="pill edit-only mb-hide-when-collapsed">
        Slide 1/1
      </span>
      <button id="nextSlideBtn" className="iconbtn edit-only mb-hide-when-collapsed" aria-label="Next slide">
        ▶
      </button>
      <button id="playSlidesBtn" className="iconbtn edit-only mb-hide-when-collapsed" aria-pressed="false">
        Play
      </button>

      <button
        id="previewBtn"
        className="iconbtn edit-only mb-hide-when-collapsed"
        aria-pressed="false"
        onClick={onPreviewClick}
      >
        Preview
      </button>
      <button
        id="togglePanelBtn"
        className="iconbtn edit-only mb-hide-when-collapsed"
        aria-expanded={!!panelOpen}
        onClick={onTogglePanel}
      >
        Panel
      </button>

      {/* Share stays (we hide whole topbar in viewer anyway for fullscreen) */}
      <span id="tokenBalance" className="token-balance">Tokens: 0</span>
      <button id="shareBtn" className="iconbtn" onClick={onShareClick}>Share</button>
    </header>
  );
}
