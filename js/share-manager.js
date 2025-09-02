// share-manager.js - Share functionality and URL handling

import { encodeState, decodeState, toast } from './utils.js';
import { buildProject, applyProject, historyState, setIsViewer } from './state-manager.js';

// Prepare project data for sharing (remove large images)
export function safeProjectForShare() {
  const p = buildProject();
  p.slides = (p.slides || []).map(s => {
    const img = s.image ? { ...s.image } : null;
    if (img) {
      const hasRemoteSrc = /^https?:\/\//i.test(img.src || '');
      const smallRemote = hasRemoteSrc && (img.src.length < 800); // allow short remote URLs
      if (!smallRemote) {
        // Strip only the large full-res data URL
        img.src = null;
      }
      // Ensure thumb stays (we added it in writeCurrentSlide)
      // no-op if it's already there
    }
    return { ...s, image: img };
  });
  return p;
}

// Build viewer URL with encoded project data
export function buildViewerUrl() {
  const payload = encodeState(safeProjectForShare());
  const url = new URL(location.href);
  url.searchParams.set('view', '1');
  url.hash = 'd=' + payload;
  return url.toString();
}

// Ensure current DOM state (image/text) is written to slides before exporting
await (await import('./slide-manager.js')).writeCurrentSlide();


// Share current project
export async function shareCurrent() {
  const url = buildViewerUrl();
  const shareData = {
    title: 'Invitation',
    text: 'You\'re invited! Open the link to view the invitation.',
    url
  };
  
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      toast('Link copied ✓');
    } else {
      prompt('Copy this viewer link:', url);
    }
  } catch (e) {
    // Silently handle share cancellation
  }
}

// Apply viewer mode from URL parameters
export function applyViewerFromUrl() {
  const params = new URLSearchParams(location.search);
  const isViewer = params.has('view') || params.get('mode') === 'view';
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const encoded = hash.get('d');

  if (isViewer) {
    setIsViewer(true);
    const body = document.body;
    body.classList.add('viewer');
    
    // Import UI manager functions
    import('./ui-manager.js').then(({ syncTopbarHeight, enterPreview }) => {
      syncTopbarHeight(); // recalc to 0
      enterPreview(); // hide editor affordances
    });
    
    [...document.querySelectorAll('.layer')].forEach(el => el.setAttribute('contenteditable', 'false'));
  }
  
  if (encoded) {
    try {
      const data = decodeState(encoded);
      historyState.lock = true;
      applyProject(data);
      historyState.lock = false;
      
      if (isViewer) {
        [...document.querySelectorAll('.layer')].forEach(el => el.setAttribute('contenteditable', 'false'));
      }
    } catch (e) {
      console.warn('Failed to decode shared state', e);
    }
  }
}

// Setup share button handler
export function setupShareHandler() {
  const shareBtn = document.getElementById('shareBtn');
  shareBtn.addEventListener('click', shareCurrent);
}