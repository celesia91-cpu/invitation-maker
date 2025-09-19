import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import AuthModal from '../../components/AuthModal.jsx';
import SlidesPanel from '../../components/SlidesPanel.jsx';
import DragHandler from '../../components/DragHandler.jsx';
import CollapsibleGroup from '../../components/CollapsibleGroup.jsx';
import ImageCanvas from '../../components/ImageCanvas.jsx';
import TextControls from '../../components/TextControls.jsx';
import PlaybackControls from '../../components/PlaybackControls.jsx';
import { useResponsive } from '../../hooks/useResponsive.js';
import { useAppState } from '../../context/AppStateContext.jsx';
import { EditorProvider, useEditorState } from '../../context/EditorContext.jsx';
import useDesignOwnership from '../../hooks/useDesignOwnership.js';

function EditorContent() {
  const router = useRouter();
  const token = router.query.token;
  const view = router.query.view;
  const {
    slides,
    setSlides,
    activeIndex,
    setActiveIndex,
    tokenBalance,
  } = useAppState();
  const editorState = useEditorState();
  const [showAuth, setShowAuth] = useState(false);
  useResponsive();
  const {
    setCurrentDesignId,
    isDesignOwned,
    ensureOwnership,
    loading: ownershipLoading,
    error: ownershipError,
  } = useDesignOwnership();

  const activeDesignId = useMemo(() => {
    if (!token) return null;
    if (Array.isArray(token)) {
      if (token.length === 0) return null;
      return token[0] ? String(token[0]) : null;
    }
    return token ? String(token) : null;
  }, [token]);

  useEffect(() => {
    if (activeDesignId) {
      setCurrentDesignId(activeDesignId);
      ensureOwnership(activeDesignId).catch(() => {});
    } else {
      setCurrentDesignId(null);
    }
  }, [activeDesignId, ensureOwnership, setCurrentDesignId]);

  const designIsOwned = activeDesignId ? isDesignOwned(activeDesignId) : true;
  const editingDisabled = Boolean(activeDesignId) && !designIsOwned;
  const ownershipStatusMessage = (() => {
    if (!activeDesignId) return 'Editing a custom design.';
    if (ownershipLoading) return 'Checking access for this design…';
    if (designIsOwned) return 'You own this design and can edit it freely.';
    if (ownershipError) return 'We could not confirm ownership. Editing is locked until you purchase this design.';
    return 'Editing is locked until you purchase this design.';
  })();

  // Seed sample slides on first load if none exist
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

  return (
    <div>
      Editor
      {token && <span> Token: {token}</span>}
      {view && <span> View: {view}</span>}
      <div>Token Balance: {tokenBalance}</div>
      <button onClick={() => setShowAuth(true)}>Login</button>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <div
        className="editor-ownership-status"
        role={editingDisabled ? 'alert' : 'status'}
        aria-live="polite"
        data-editing-disabled={editingDisabled ? 'true' : 'false'}
      >
        <strong>Design Access:</strong> {ownershipStatusMessage}
      </div>
      <CollapsibleGroup title="Slides">
        <SlidesPanel slides={slides} />
      </CollapsibleGroup>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>
        <div
          aria-disabled={editingDisabled}
          data-editing-locked={editingDisabled ? 'true' : 'false'}
          style={editingDisabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
        >
          <ImageCanvas />
          <div style={{ marginTop: 8 }}>
            <PlaybackControls />
          </div>
        </div>
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
  );
}

export default function Editor() {
  return (
    <EditorProvider>
      <EditorContent />
    </EditorProvider>
  );
}
