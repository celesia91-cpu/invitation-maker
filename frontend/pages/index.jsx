import { useEffect, useState } from 'react';
import Image from 'next/image';
import Topbar from '../components/Topbar.jsx';
import AuthModal from '../components/AuthModal.jsx';
import SidePanel from '../components/SidePanel.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import FullscreenOverlay from '../components/FullscreenOverlay.jsx';
import RotateOverlay from '../components/RotateOverlay.jsx';
import PreviewModal from '../components/PreviewModal.jsx';
import PurchaseModal from '../components/PurchaseModal.jsx';
import Marketplace from '../components/Marketplace.jsx';
import useAuth from '../hooks/useAuth.js';

export default function MarketplacePage() {
  const auth = useAuth();
  // Auto-open auth if there is no active session
  const [showAuth, setShowAuth] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [view, setView] = useState('marketplace'); // 'marketplace' | 'editor'
  const [showPreview, setShowPreview] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [isTopbarVisible, setIsTopbarVisible] = useState(true);

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

  return (
    <div>
      {/* Authentication Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Marketplace page (hidden by default) */}
      <Marketplace
        isOpen={view === 'marketplace'}
        onSkipToEditor={() => setView('editor')}
      />

      {/* Editor page wrapper */}
      <div id="editorPage" className={`page${view === 'editor' ? '' : ' hidden'}`}>
        <Topbar
          onPreviewClick={() => setShowPreview(true)}
          onShareClick={() => setShowPurchase(true)}
          onTogglePanel={() => setPanelOpen((v) => !v)}
          panelOpen={panelOpen}
        />

        {/* Example button to open Auth modal (not in original HTML) */}
        <div style={{ padding: 8 }}>
          <button className="btn" onClick={() => setShowAuth(true)}>Sign In</button>
        </div>

        {/* Mobile topbar toggle (hidden in viewer) */}
        <button
          id="topbarToggle"
          className="iconbtn"
          aria-controls="topbar"
          aria-expanded={isTopbarVisible}
          aria-label={isTopbarVisible ? 'Collapse top bar' : 'Expand top bar'}
          onClick={() => setIsTopbarVisible((value) => !value)}
        >
          {isTopbarVisible ? '▾' : '▴'}
        </button>

        {/* Fullscreen and rotate overlays */}
        <FullscreenOverlay />
        <RotateOverlay />

        {/* Optional backdrop */}
        <div className="backdrop" id="backdrop"></div>

        <SidePanel />

        <main className="stage">
          <div className="wrap">
            <div id="work" aria-label="Invitation stage (16:9)">
              <div id="vGuide" className="guide v" aria-hidden="true"></div>
              <div id="hGuide" className="guide h" aria-hidden="true"></div>

                <div id="userBgWrap">
                  <Image
                    id="userBg"
                    src="/placeholder.jpg"
                    alt=""
                    width={800}
                    height={450}
                    priority
                  />
                </div>
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

              <button id="uploadBgBtn">Upload Background</button>
              <input type="file" id="bgFileInput" accept="image/*" />
            </div>
          </div>
        </main>
      </div>

      {/* Global modals */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onUseDesign={() => { setShowPreview(false); setShowPurchase(true); }}
      />
      <PurchaseModal
        isOpen={showPurchase}
        onConfirm={() => setShowPurchase(false)}
        onCancel={() => setShowPurchase(false)}
      />
    </div>
  );
}

