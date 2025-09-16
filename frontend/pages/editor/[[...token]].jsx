import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
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

function EditorContent() {
  const router = useRouter();
  const token = router.query.token;
  const view = router.query.view;
  const {
    slides,
    setSlides,
    activeIndex,
    setActiveIndex,
    selectedSlide,
    setSelectedSlide,
    tokenBalance,
  } = useAppState();
  const editorState = useEditorState();
  const [showAuth, setShowAuth] = useState(false);
  useResponsive();

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
      setSelectedSlide(0);
    }
  }, [slides, setSlides, setActiveIndex, setSelectedSlide]);

  // Keep selectedSlide and activeIndex in sync during migration
  useEffect(() => {
    if (selectedSlide !== activeIndex) {
      setActiveIndex(selectedSlide);
    }
  }, [selectedSlide, activeIndex, setActiveIndex]);
  useEffect(() => {
    if (activeIndex !== selectedSlide) {
      setSelectedSlide(activeIndex);
    }
  }, [activeIndex, selectedSlide, setSelectedSlide]);
  
  return (
    <div>
      Editor
      {token && <span> Token: {token}</span>}
      {view && <span> View: {view}</span>}
      <div>Token Balance: {tokenBalance}</div>
      <button onClick={() => setShowAuth(true)}>Login</button>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <CollapsibleGroup title="Slides">
        <SlidesPanel slides={slides} />
      </CollapsibleGroup>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>
        <div>
          <ImageCanvas />
          <div style={{ marginTop: 8 }}>
            <PlaybackControls />
          </div>
        </div>
        <div>
          <TextControls />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <DragHandler />
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
