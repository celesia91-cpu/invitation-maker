import { useRouter } from 'next/router';
import { useState } from 'react';
import AuthModal from '../../components/AuthModal.jsx';
import SlidesPanel from '../../components/SlidesPanel.jsx';
import TextLayer from '../../components/TextLayer.jsx';
import DragHandler from '../../components/DragHandler.jsx';
import CollapsibleGroup from '../../components/CollapsibleGroup.jsx';
import { useAppState } from '../../context/AppStateContext.jsx';

export default function Editor() {
  const router = useRouter();
  const token = router.query.token;
  const view = router.query.view;
  const { selectedSlide, tokenBalance } = useAppState();
  const [showAuth, setShowAuth] = useState(false);
  
  const slides = [
    { id: 1, text: 'First Slide' },
    { id: 2, text: 'Second Slide' },
  ];
  
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
      <TextLayer initialText={slides[selectedSlide]?.text} />
      <DragHandler />
    </div>
  );
}