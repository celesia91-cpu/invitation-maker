import { useMemo } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';
import { resolveCapabilities, resolveRole } from '../utils/roleCapabilities.js';

export default function Topbar({
  onPreviewClick,
  onShareClick,
  onTogglePanel,
  panelOpen,
  roleCapabilities,
}) {
  const { userRole } = useAppState();

  const { role: resolvedRole, canEdit } = useMemo(() => {
    const fallbackRole = resolveRole(userRole);
    if (roleCapabilities && typeof roleCapabilities === 'object') {
      return resolveCapabilities(roleCapabilities, fallbackRole);
    }
    return resolveCapabilities({ role: fallbackRole }, fallbackRole);
  }, [roleCapabilities, userRole]);

  const readOnly = !canEdit;
  const editLockTitle = readOnly
    ? 'Editing controls are limited to creator or admin roles.'
    : undefined;

  return (
    <header
      className="topbar"
      id="topbar"
      data-editor-role={resolvedRole}
      data-editor-readonly={readOnly || undefined}
    >
      <div className="brand"> Celesia Animated Invitation</div>
      <div className="grow"></div>

      {/* editor controls hidden in viewer via .edit-only */}
      <button
        id="undoBtn"
        className="iconbtn edit-only mb-hide-when-collapsed"
        aria-label="Undo"
        disabled
        title={editLockTitle}
      >
        Undo
      </button>
      <button
        id="redoBtn"
        className="iconbtn edit-only mb-hide-when-collapsed"
        aria-label="Redo"
        disabled
        title={editLockTitle}
      >
        Redo
      </button>

      <button
        id="prevSlideBtn"
        className="iconbtn edit-only mb-hide-when-collapsed"
        aria-label="Previous slide"
        disabled={readOnly}
        title={editLockTitle}
      >
        ◀
      </button>
      <span id="slideLabel" className="pill edit-only mb-hide-when-collapsed">
        Slide 1/1
      </span>
      <button
        id="nextSlideBtn"
        className="iconbtn edit-only mb-hide-when-collapsed"
        aria-label="Next slide"
        disabled={readOnly}
        title={editLockTitle}
      >
        ▶
      </button>
      <button
        id="playSlidesBtn"
        className="iconbtn edit-only mb-hide-when-collapsed"
        aria-pressed="false"
        disabled={readOnly}
        title={editLockTitle}
      >
        Play
      </button>

      <button
        id="previewBtn"
        className="iconbtn edit-only mb-hide-when-collapsed"
        aria-pressed="false"
        onClick={onPreviewClick}
        disabled={readOnly}
        title={editLockTitle}
      >
        Preview
      </button>
      <button
        id="togglePanelBtn"
        className="iconbtn edit-only mb-hide-when-collapsed"
        aria-expanded={!!panelOpen}
        onClick={onTogglePanel}
        disabled={readOnly}
        title={editLockTitle}
      >
        Panel
      </button>

      {readOnly && (
        <span
          className="role-indicator"
          role="note"
          aria-live="polite"
          style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8' }}
        >
          View only ({resolvedRole})
        </span>
      )}

      {/* Share stays (we hide whole topbar in viewer anyway for fullscreen) */}
      <span id="tokenBalance" className="token-balance">Tokens: 0</span>
      <button id="shareBtn" className="iconbtn" onClick={onShareClick}>Share</button>
    </header>
  );
}
