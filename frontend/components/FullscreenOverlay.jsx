export default function FullscreenOverlay() {
  return (
    <div
      id="fsOverlay"
      className="fs-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fsTitle"
      aria-hidden="true"
    >
      <div className="fs-card">
        <h2 id="fsTitle">Tap to view full-screen</h2>
        <p>For the best experience, we&apos;ll hide the browser bar.</p>
        <button id="fsEnterBtn" className="fs-btn" type="button">
          Enter Full-Screen
        </button>
      </div>
    </div>
  );
}

