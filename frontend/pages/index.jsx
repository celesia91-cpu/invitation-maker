import { useState } from 'react';
import Topbar from '../components/Topbar.jsx';
import AuthModal from '../components/AuthModal.jsx';
import SidePanel from '../components/SidePanel.jsx';

export default function Marketplace() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div>
      {/* Authentication Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

      <Topbar />

      {/* Example button to open Auth modal (not in original HTML) */}
      <div style={{ padding: 8 }}>
        <button className="btn" onClick={() => setShowAuth(true)}>Sign In</button>
      </div>

      {/* Mobile topbar toggle (hidden in viewer) */}
      <button id="topbarToggle" className="iconbtn" aria-expanded="true" aria-label="Collapse top bar">
        �-�
      </button>

      {/* Fullscreen prompt overlay */}
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
          <p>For the best experience, we'll hide the browser bar.</p>
          <button id="fsEnterBtn" className="fs-btn" type="button">Enter Full-Screen</button>
        </div>
      </div>

      <div className="backdrop" id="backdrop"></div>

      <SidePanel />

      <main className="stage">
        <div className="wrap">
          <div id="work" aria-label="Invitation stage (16:9)">
            <div id="vGuide" className="guide v" aria-hidden="true"></div>
            <div id="hGuide" className="guide h" aria-hidden="true"></div>

            <div id="userBgWrap">
              <img id="userBg" alt="" />
            </div>
            <video id="fxVideo" autoPlay muted loop playsInline>
              <source src="./Comp 1.webm" type="video/webm" />
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
  );
}
