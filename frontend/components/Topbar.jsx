import { useMemo } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';
import { resolveCapabilities, resolveRole } from '../utils/roleCapabilities.js';
import { getRoleNavigationLinks } from '../utils/navigationLinks.js';
import { usePageNavigation } from '../utils/navigationManager.js';

export default function Topbar({
  onPreviewClick,
  onShareClick,
  onTogglePanel,
  onSaveToMarketplace,
  panelOpen,
  currentRole,
  roleCapabilities,
  showBackToMarketplace = false,
  hasUnsavedChanges = false,
}) {
  const { userRole } = useAppState();
  const { goToMarketplace, setUnsavedChanges } = usePageNavigation();

  const { role: resolvedRole, canEdit } = useMemo(() => {
    const fallbackRole = resolveRole(currentRole ?? userRole);
    if (roleCapabilities && typeof roleCapabilities === 'object') {
      return resolveCapabilities(roleCapabilities, fallbackRole);
    }
    return resolveCapabilities({ role: fallbackRole }, fallbackRole);
  }, [currentRole, roleCapabilities, userRole]);

  const navigationLinks = useMemo(
    () => getRoleNavigationLinks(resolvedRole),
    [resolvedRole]
  );

  const readOnly = !canEdit;
  const isAdmin = resolvedRole === 'admin';
  const editLockTitle = readOnly
    ? 'Editing controls are limited to creator or admin roles.'
    : undefined;

  const handleBackToMarketplace = () => {
    setUnsavedChanges(hasUnsavedChanges);
    goToMarketplace({
      checkUnsavedChanges: hasUnsavedChanges,
    });
  };

  return (
    <header
      className="topbar"
      id="topbar"
      data-editor-role={resolvedRole}
      data-editor-readonly={readOnly || undefined}
    >
      <div className="brand"> Celesia Animated Invitation</div>

      {showBackToMarketplace && (
        <button
          type="button"
          className="back-to-marketplace-btn"
          onClick={handleBackToMarketplace}
          title={hasUnsavedChanges ? "Back to Marketplace (unsaved changes will be lost)" : "Back to Marketplace"}
        >
          ← Marketplace
          {hasUnsavedChanges && <span className="unsaved-indicator" aria-label="Unsaved changes">*</span>}
        </button>
      )}

      <nav className="topbar-nav" aria-label="Primary">
        <ul className="topbar-links">
          {navigationLinks.map((link) => (
            <li key={link.key || link.href} className="topbar-link-item">
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </nav>
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

      {/* Admin-only Save to Marketplace button */}
      {isAdmin && onSaveToMarketplace && (
        <button
          type="button"
          className="iconbtn save-to-marketplace-btn"
          onClick={onSaveToMarketplace}
          title="Save design to marketplace"
        >
          💾 Save to Marketplace
        </button>
      )}

      {/* Share stays (we hide whole topbar in viewer anyway for fullscreen) */}
      <span id="tokenBalance" className="token-balance">Tokens: 0</span>
      <button id="shareBtn" className="iconbtn" onClick={onShareClick}>Share</button>
    </header>
  );
}
