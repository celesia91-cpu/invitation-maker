import { useCallback, useEffect, useMemo, useState } from 'react';
import Topbar from '../components/Topbar.jsx';
import AuthModal from '../components/AuthModal.jsx';
import SidePanel from '../components/SidePanel.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import FullscreenOverlay from '../components/FullscreenOverlay.jsx';
import RotateOverlay from '../components/RotateOverlay.jsx';
import PreviewModal from '../components/PreviewModal.jsx';
import PurchaseModal from '../components/PurchaseModal.jsx';
import Marketplace from '../components/Marketplace.jsx';
import ImageCanvas from '../components/ImageCanvas.jsx';
import UploadBackgroundButton from '../components/UploadBackgroundButton.jsx';
import withRoleGate from '../components/withRoleGate.jsx';
import useAuth from '../hooks/useAuth.js';
import useDesignOwnership from '../hooks/useDesignOwnership.js';
import { useAppState } from '../context/AppStateContext.jsx';
import { resolveCapabilities } from '../utils/roleCapabilities.js';

const DEFAULT_MARKETPLACE_DESIGN_ID = 'demo-marketplace-design';

const MARKETPLACE_ALLOWED_ROLES = ['guest', 'user', 'consumer', 'creator', 'admin'];
const EDITOR_ALLOWED_ROLES = ['guest', 'user', 'consumer', 'creator', 'admin'];

function MarketplaceForbidden({ isOpen, userRole }) {
  const roleLabel = typeof userRole === 'string' && userRole.trim() ? userRole : 'unknown';
  return (
    <div id="marketplacePage" className={`page${isOpen ? '' : ' hidden'}`}>
      <div className="forbidden-placeholder" role="alert" data-testid="marketplace-forbidden">
        Marketplace access is unavailable for the “{roleLabel}” role.
      </div>
    </div>
  );
}

function EditorForbidden({ isVisible, userRole }) {
  const roleLabel = typeof userRole === 'string' && userRole.trim() ? userRole : 'unknown';
  return (
    <div id="editorPage" className={`page${isVisible ? '' : ' hidden'}`}>
      <div className="forbidden-placeholder" role="alert" data-testid="editor-forbidden">
        Editor access requires a creator-capable role. Current role: {roleLabel}.
      </div>
    </div>
  );
}

function EditorShell({
  isVisible,
  panelOpen,
  onTogglePanel,
  onPreviewClick,
  onShareClick,
  onOpenAuth,
  isTopbarVisible,
  onToggleTopbar,
  authApi,
  roleCapabilities,
}) {
  return (
    <div id="editorPage" className={`page${isVisible ? '' : ' hidden'}`}>
      <Topbar
        onPreviewClick={onPreviewClick}
        onShareClick={onShareClick}
        onTogglePanel={onTogglePanel}
        panelOpen={panelOpen}
        roleCapabilities={roleCapabilities}
      />

      {/* Example button to open Auth modal (not in original HTML) */}
      <div style={{ padding: 8 }}>
        <button className="btn" onClick={onOpenAuth}>Sign In</button>
      </div>

      {/* Mobile topbar toggle (hidden in viewer) */}
      <button
        id="topbarToggle"
        className="iconbtn"
        aria-controls="topbar"
        aria-expanded={isTopbarVisible}
        aria-label={isTopbarVisible ? 'Collapse top bar' : 'Expand top bar'}
        onClick={onToggleTopbar}
      >
        {isTopbarVisible ? '▾' : '▴'}
      </button>

      {/* Fullscreen and rotate overlays */}
      <FullscreenOverlay />
      <RotateOverlay />

      {/* Optional backdrop */}
      <div className="backdrop" id="backdrop"></div>

      <SidePanel roleCapabilities={roleCapabilities} />

      <main className="stage">
        <div className="wrap">
          <ImageCanvas>
            <div id="vGuide" className="guide v" aria-hidden="true"></div>
            <div id="hGuide" className="guide h" aria-hidden="true"></div>
            <video id="fxVideo" autoPlay muted loop playsInline>
              <source src="/Comp 1.webm" type="video/webm" />
            </video>

            <div id="bgBox" className="hidden" aria-label="Background image transform box">
              <div className="handle nw" data-handle="nw"></div>
              <div className="handle ne" data-handle="ne"></div>
              <div className="handle se" data-handle="se"></div>
              <div className="handle sw" data-handle="sw"></div>
              <div className="handle rotate" data-handle="rotate" title="Rotate"></div>
            </div>

            <div id="rsvpBar" className="rsvp" role="group" aria-label="RSVP">
              <button id="rsvpYes" className="rsvp-btn">Yes</button>
              <button id="rsvpMaybe" className="rsvp-btn">Maybe</button>
              <button id="rsvpNo" className="rsvp-btn">No</button>
              <button id="rsvpMap" className="rsvp-btn primary">View Map</button>
            </div>

            <UploadBackgroundButton api={authApi} roleCapabilities={roleCapabilities} />
          </ImageCanvas>
        </div>
      </main>
    </div>
  );
}

const RoleAwareMarketplace = withRoleGate(Marketplace, {
  allowedRoles: MARKETPLACE_ALLOWED_ROLES,
  fallback: MarketplaceForbidden,
});

const RoleAwareEditorShell = withRoleGate(EditorShell, {
  allowedRoles: EDITOR_ALLOWED_ROLES,
  fallback: EditorForbidden,
});

export default function MarketplacePage() {
  const auth = useAuth();
  const { userRole } = useAppState();
  const roleCapabilities = useMemo(
    () => resolveCapabilities({ role: userRole }, userRole),
    [userRole]
  );
  const {
    setCurrentDesignId,
    isDesignOwned,
    currentDesignId,
  } = useDesignOwnership();
  // Auto-open auth if there is no active session
  const [showAuth, setShowAuth] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [view, setView] = useState('marketplace'); // 'marketplace' | 'editor'
  const [showPreview, setShowPreview] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [isTopbarVisible, setIsTopbarVisible] = useState(true);
  const [activeDesignId, setActiveDesignId] = useState(DEFAULT_MARKETPLACE_DESIGN_ID);

  useEffect(() => {
    if (!auth.isAuthenticated) setShowAuth(true);
  }, [auth.isAuthenticated]);

  // Reflect panel state on body for CSS to slide the panel in
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('panel-open', panelOpen && view === 'editor');
    }
  }, [panelOpen, view]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const body = document.body;
    const shouldHideTopbar = view === 'editor' && !isTopbarVisible;
    body.classList.toggle('topbar-hidden', shouldHideTopbar);

    return () => {
      body.classList.remove('topbar-hidden');
    };
  }, [isTopbarVisible, view]);

  useEffect(() => {
    if (view !== 'editor') {
      setIsTopbarVisible(true);
    }
  }, [view]);

  useEffect(() => {
    if (activeDesignId) {
      setCurrentDesignId(activeDesignId);
    }
  }, [activeDesignId, setCurrentDesignId]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setActiveDesignId(DEFAULT_MARKETPLACE_DESIGN_ID);
    }
  }, [auth.isAuthenticated]);

  const ensureDesignId = useCallback(() => {
    setActiveDesignId((previous) => {
      if (previous) return previous;
      return currentDesignId || DEFAULT_MARKETPLACE_DESIGN_ID;
    });
  }, [currentDesignId]);

  const handlePreviewClick = () => {
    ensureDesignId();
    setShowPreview(true);
  };

  const handleShareClick = () => {
    ensureDesignId();
    const designId = activeDesignId || currentDesignId || DEFAULT_MARKETPLACE_DESIGN_ID;
    if (isDesignOwned(designId)) {
      setView('editor');
    } else {
      setShowPurchase(true);
    }
  };

  const handleTogglePanel = () => setPanelOpen((value) => !value);
  const handleToggleTopbar = () => setIsTopbarVisible((value) => !value);
  const handleOpenAuth = () => setShowAuth(true);

  const isEditorView = view === 'editor';

  return (
    <div>
      {/* Authentication Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Marketplace page (hidden by default) */}
      <RoleAwareMarketplace
        isOpen={view === 'marketplace'}
        onSkipToEditor={() => setView('editor')}
      />

      {/* Editor page wrapper */}
      <RoleAwareEditorShell
        isVisible={isEditorView}
        panelOpen={panelOpen}
        onTogglePanel={handleTogglePanel}
        onPreviewClick={handlePreviewClick}
        onShareClick={handleShareClick}
        onOpenAuth={handleOpenAuth}
        isTopbarVisible={isTopbarVisible}
        onToggleTopbar={handleToggleTopbar}
        authApi={auth.api}
        roleCapabilities={roleCapabilities}
      />

      {/* Global modals */}
      <PreviewModal
        isOpen={showPreview}
        designId={activeDesignId}
        onClose={() => setShowPreview(false)}
        onUseDesign={({ designId, owned }) => {
          const nextDesignId = designId || activeDesignId || DEFAULT_MARKETPLACE_DESIGN_ID;
          setActiveDesignId(nextDesignId);
          if (owned) {
            setShowPreview(false);
            setView('editor');
          } else {
            setShowPreview(false);
            setShowPurchase(true);
          }
        }}
      />
      <PurchaseModal
        isOpen={showPurchase}
        designId={activeDesignId}
        onConfirm={({ designId, owned }) => {
          if (designId) {
            setActiveDesignId(designId);
          }
          setShowPurchase(false);
          if (owned) {
            setView('editor');
          }
        }}
        onCancel={() => setShowPurchase(false)}
      />
    </div>
  );
}
