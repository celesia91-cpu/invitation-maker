import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthModal from '../../components/AuthModal.jsx';
import Breadcrumbs from '../../components/Breadcrumbs.jsx';
import Topbar from '../../components/Topbar.jsx';
import SidePanel from '../../components/SidePanel.jsx';
import FullscreenOverlay from '../../components/FullscreenOverlay.jsx';
import RotateOverlay from '../../components/RotateOverlay.jsx';
import PreviewModal from '../../components/PreviewModal.jsx';
import PurchaseModal from '../../components/PurchaseModal.jsx';
import DesignPublishModal from '../../components/DesignPublishModal.jsx';
import SlidesPanel from '../../components/SlidesPanel.jsx';
import DragHandler from '../../components/DragHandler.jsx';
import CollapsibleGroup from '../../components/CollapsibleGroup.jsx';
import ImageCanvas from '../../components/ImageCanvas.jsx';
import TextControls from '../../components/TextControls.jsx';
import PlaybackControls from '../../components/PlaybackControls.jsx';
import UploadBackgroundButton from '../../components/UploadBackgroundButton.jsx';
import UploadMusicButton from '../../components/UploadMusicButton.jsx';
import { useResponsive } from '../../hooks/useResponsive.js';
import { useAppState } from '../../context/AppStateContext.jsx';
import { EditorProvider, useEditorState } from '../../context/EditorContext.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDesignOwnership from '../../hooks/useDesignOwnership.js';
import { resolveCapabilities } from '../../utils/roleCapabilities.js';
import { usePageNavigation } from '../../utils/navigationManager.js';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges.js';

const DEFAULT_EDITOR_DESIGN_ID = 'demo-marketplace-design';

function EditorContent() {
  const router = useRouter();
  const { token, view } = router.query ?? {};
  const {
    slides,
    setSlides,
    activeIndex,
    setActiveIndex,
    tokenBalance,
    userRole,
  } = useAppState();
  const editorState = useEditorState();
  const editorReady = Boolean(editorState);
  const auth = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [isTopbarVisible, setIsTopbarVisible] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [activeDesignId, setActiveDesignId] = useState(null);
  useResponsive();
  const navigation = usePageNavigation();
  const unsavedChanges = useUnsavedChanges({
    trackSlideChanges: true,
    trackImageChanges: true,
    autoSave: false,
  });
  const {
    setCurrentDesignId,
    isDesignOwned,
    ensureOwnership,
    loading: ownershipLoading,
    error: ownershipError,
    currentDesignId,
  } = useDesignOwnership();

  const roleCapabilities = useMemo(
    () => resolveCapabilities({ role: userRole }, userRole),
    [userRole]
  );

  const isUserAuthenticated = Boolean(auth?.isAuthenticated);

  const setCurrentDesignIdRef = useRef(setCurrentDesignId);

  useEffect(() => {
    setCurrentDesignIdRef.current = setCurrentDesignId;
  }, [setCurrentDesignId]);

  useEffect(() => {
    if (!auth.isInitialized) return;
    setShowAuth(!auth.isAuthenticated);
  }, [auth.isAuthenticated, auth.isInitialized]);

  const routeDesignId = useMemo(() => {
    if (!router || !router.isReady) return undefined;
    if (!token) return null;
    if (Array.isArray(token)) {
      if (token.length === 0) return null;
      const [first] = token;
      return first ? String(first) : null;
    }
    return token ? String(token) : null;
  }, [router, token]);

  const syncDesignSelection = useCallback(
    (designId, options = {}) => {
      const allowBlank = Boolean(options.allowBlank);
      const shouldUpdateGlobal =
        options && Object.prototype.hasOwnProperty.call(options, 'updateGlobal')
          ? Boolean(options.updateGlobal)
          : true;

      const candidate =
        designId !== undefined
          ? designId
          : activeDesignId !== undefined && activeDesignId !== null
            ? activeDesignId
            : currentDesignId;

      if (allowBlank) {
        const blank = candidate === null || candidate === undefined || `${candidate}`.trim() === '';
        if (blank) {
          if (activeDesignId !== null) {
            setActiveDesignId(null);
          }
          if (shouldUpdateGlobal) {
            const updateCurrentDesignId = setCurrentDesignIdRef.current;
            if (typeof updateCurrentDesignId === 'function') {
              updateCurrentDesignId(null);
            }
          }
          return null;
        }
      }

      const fallback =
        candidate === null || candidate === undefined || `${candidate}`.trim() === ''
          ? DEFAULT_EDITOR_DESIGN_ID
          : candidate;
      const normalized = `${fallback}`.trim();

      if (!normalized) {
        if (activeDesignId !== null) {
          setActiveDesignId(null);
        }
        if (shouldUpdateGlobal) {
          const updateCurrentDesignId = setCurrentDesignIdRef.current;
          if (typeof updateCurrentDesignId === 'function') {
            updateCurrentDesignId(null);
          }
        }
        return null;
      }

      if (activeDesignId !== normalized) {
        setActiveDesignId(normalized);
      }

      if (shouldUpdateGlobal && currentDesignId !== normalized) {
        const updateCurrentDesignId = setCurrentDesignIdRef.current;
        if (typeof updateCurrentDesignId === 'function') {
          updateCurrentDesignId(normalized);
        }
      }

      return normalized;
    },
    [activeDesignId, currentDesignId]
  );

  useEffect(() => {
    if (routeDesignId === undefined) return;
    syncDesignSelection(routeDesignId, { allowBlank: true });
  }, [routeDesignId, syncDesignSelection]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      return;
    }

    syncDesignSelection(DEFAULT_EDITOR_DESIGN_ID, { updateGlobal: false });
  }, [auth.isAuthenticated, syncDesignSelection]);

  useEffect(() => {
    if (!isUserAuthenticated) return;
    const designIdToCheck = activeDesignId || currentDesignId;
    if (designIdToCheck) {
      ensureOwnership(designIdToCheck).catch(() => {});
    }
  }, [activeDesignId, currentDesignId, ensureOwnership, isUserAuthenticated]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const { body } = document;
    body.classList.toggle('panel-open', panelOpen);
    return () => {
      body.classList.remove('panel-open');
    };
  }, [panelOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const { body } = document;
    body.classList.toggle('topbar-hidden', !isTopbarVisible);
    return () => {
      body.classList.remove('topbar-hidden');
    };
  }, [isTopbarVisible]);

  const designIsOwned = activeDesignId ? isDesignOwned(activeDesignId) : true;
  const editingDisabled = Boolean(activeDesignId) && !designIsOwned;
  const ownershipStatusMessage = (() => {
    if (!activeDesignId) return 'Editing a custom design.';
    if (ownershipLoading) return 'Checking access for this design…';
    if (designIsOwned) return 'You own this design and can edit it freely.';
    if (ownershipError) return 'We could not confirm ownership. Editing is locked until you purchase this design.';
    return 'Editing is locked until you purchase this design.';
  })();

  useEffect(() => {
    if (!slides || slides.length === 0) {
      setSlides([
        {
          id: 1,
          name: 'Slide 1',
          image: null,
          layers: [
            { text: 'First Slide', left: 16, top: 16, fontSize: 28, fontFamily: 'system-ui', color: '#ffffff' },
          ],
          workSize: { w: 800, h: 450 },
          durationMs: 3000,
        },
        {
          id: 2,
          name: 'Slide 2',
          image: null,
          layers: [
            { text: 'Second Slide', left: 16, top: 16, fontSize: 28, fontFamily: 'system-ui', color: '#ffffff' },
          ],
          workSize: { w: 800, h: 450 },
          durationMs: 3000,
        },
      ]);
      setActiveIndex(0);
    }
  }, [slides, setSlides, setActiveIndex]);

  const ensureDesignId = useCallback(
    () => syncDesignSelection(undefined),
    [syncDesignSelection]
  );

  const navigateToDesign = useCallback(
    (designIdValue) => {
      const normalized =
        designIdValue === null || designIdValue === undefined || `${designIdValue}`.trim() === ''
          ? null
          : `${designIdValue}`.trim();

      const targetHref = normalized ? `/editor/${encodeURIComponent(normalized)}` : '/editor';
      if (router && typeof router.push === 'function') {
        if (router.asPath !== targetHref) {
          router.push(targetHref);
        }
      }
    },
    [router]
  );

  const handlePreviewClick = useCallback(() => {
    const designIdValue = ensureDesignId();
    if (!designIdValue && !isUserAuthenticated) {
      setShowAuth(true);
      return;
    }
    setShowPreview(true);
  }, [ensureDesignId, isUserAuthenticated]);

  const handleShareClick = useCallback(() => {
    const designIdValue = ensureDesignId();
    if (designIdValue && isDesignOwned(designIdValue)) {
      setShowPreview(true);
    } else {
      setShowPurchase(true);
    }
  }, [ensureDesignId, isDesignOwned]);

  const handleSaveToMarketplace = useCallback(() => {
    if (userRole !== 'admin') {
      // Debug info removed for production
      return;
    }

    setShowPublishModal(true);
  }, [userRole]);

  const handlePublishModalSave = useCallback(async (publishData) => {
    try {
      // Save using the unsaved changes hook
      const result = await unsavedChanges.saveChanges(async (data) => {
        if (auth?.api?.saveDesignToMarketplace) {
          return await auth.api.saveDesignToMarketplace({
            designId: activeDesignId,
            designData: data,
            ...publishData,
          });
        }

        // Mock save for development
        // Debug info removed for production
        return {
          success: true,
          designId: activeDesignId || `design-${Date.now()}`,
          message: `Design "${publishData.title}" saved as ${publishData.status}`,
        };
      });

      if (result.success) {
        // Update the design ID if a new one was created
        if (result.designId && result.designId !== activeDesignId) {
          syncDesignSelection(result.designId);
        }

        // Show success feedback (you might want to use a toast instead of alert)
        // Debug info removed for production
      }

      return result;
    } catch (error) {
      console.error('Error saving to marketplace:', error);
      return { success: false, error };
    }
  }, [unsavedChanges, auth?.api, activeDesignId, syncDesignSelection]);

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => !prev);
  }, []);

  const toggleTopbar = useCallback(() => {
    setIsTopbarVisible((prev) => !prev);
  }, []);

  const tokenDisplay = useMemo(() => {
    if (!token) return null;
    return Array.isArray(token) ? token.join(', ') : String(token);
  }, [token]);

  return (
    <div
      id="editorPage"
      className="page"
      data-testid="editor-page-root"
      data-panel-open={panelOpen ? 'true' : 'false'}
      data-topbar-visible={isTopbarVisible ? 'true' : 'false'}
      data-editor-ready={editorReady ? 'true' : 'false'}
    >
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <Breadcrumbs />

      <Topbar
        onPreviewClick={handlePreviewClick}
        onShareClick={handleShareClick}
        onTogglePanel={togglePanel}
        onSaveToMarketplace={handleSaveToMarketplace}
        panelOpen={panelOpen}
        roleCapabilities={roleCapabilities}
        showBackToMarketplace={true}
        hasUnsavedChanges={unsavedChanges.hasUnsavedChanges}
      />

      <div style={{ padding: 8 }}>
        <button className="btn" onClick={() => setShowAuth(true)}>Sign In</button>
      </div>

      <button
        id="topbarToggle"
        className="iconbtn"
        aria-controls="topbar"
        aria-expanded={isTopbarVisible}
        aria-label={isTopbarVisible ? 'Collapse top bar' : 'Expand top bar'}
        onClick={toggleTopbar}
      >
        {isTopbarVisible ? '▾' : '▴'}
      </button>

      <FullscreenOverlay />
      <RotateOverlay />

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

            <UploadBackgroundButton api={auth.api} roleCapabilities={roleCapabilities} />
            <UploadMusicButton api={auth.api} roleCapabilities={roleCapabilities} />
          </ImageCanvas>

          <div
            className="editor-ownership-status"
            role={editingDisabled ? 'alert' : 'status'}
            aria-live="polite"
            data-editing-disabled={editingDisabled ? 'true' : 'false'}
            style={{ marginTop: 16 }}
          >
            <strong>Design Access:</strong> {ownershipStatusMessage}
          </div>

          <div style={{ marginTop: 12 }}>
            <div>Token Balance: {tokenBalance}</div>
            {view && <div>View: {String(view)}</div>}
            {tokenDisplay && <div>Token: {tokenDisplay}</div>}
          </div>

          <CollapsibleGroup title="Slides">
            <SlidesPanel slides={slides} />
          </CollapsibleGroup>

          <div style={{ marginTop: 16 }}>
            <div
              aria-disabled={editingDisabled}
              data-editing-locked={editingDisabled ? 'true' : 'false'}
              style={editingDisabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
            >
              <PlaybackControls />
            </div>
          </div>

          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 16 }}
          >
            <div
              aria-disabled={editingDisabled}
              data-editing-locked={editingDisabled ? 'true' : 'false'}
              style={editingDisabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
            >
              <TextControls />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              aria-disabled={editingDisabled}
              data-editing-locked={editingDisabled ? 'true' : 'false'}
              style={editingDisabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
            >
              <DragHandler />
            </div>
          </div>
        </div>
      </main>

      <PreviewModal
        isOpen={showPreview}
        designId={activeDesignId}
        onClose={() => setShowPreview(false)}
        onUseDesign={({ designId, owned }) => {
          const nextDesignId = syncDesignSelection(designId);
          if (owned) {
            setShowPreview(false);
            navigateToDesign(nextDesignId);
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
          const nextDesignId = syncDesignSelection(designId);
          setShowPurchase(false);
          if (owned) {
            navigateToDesign(nextDesignId);
          }
        }}
        onCancel={() => setShowPurchase(false)}
      />

      <DesignPublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onSave={handlePublishModalSave}
        designData={{ slides, workSize: { w: 800, h: 450 } }}
        initialValues={{
          title: activeDesignId ? `Design ${activeDesignId}` : 'New Design',
          category: 'Birthday',
          status: 'draft',
        }}
      />
    </div>
  );
}

export default function Editor() {
  return (
    <EditorProvider>
      <EditorContent />
    </EditorProvider>
  );
}
