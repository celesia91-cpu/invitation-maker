// share-manager.js - Fixed sharing functionality

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
        // Strip only the large full-res data URL but keep transformations
        img.src = null;
      }
      // Ensure thumb and transformations stay
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

// FIXED: Share current project with proper state capture
export async function shareCurrent() {
  try {
    // CRITICAL FIX: Ensure current DOM state is captured before sharing
    const { writeCurrentSlide } = await import('./slide-manager.js');
    writeCurrentSlide();
    
    // Small delay to ensure state is written
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Build viewer URL with current state
    const url = buildViewerUrl();
    
    const shareData = {
      title: 'Invitation',
      text: 'You\'re invited! Open the link to view the invitation.',
      url
    };
    
    console.log('Sharing URL:', url); // Debug log
    
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      toast('Link copied ✓');
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast('Link copied ✓');
    }
  } catch (error) {
    console.error('Share failed:', error);
    toast('Share failed');
  }
}

// Apply viewer mode from URL parameters
export function applyViewerFromUrl() {
  const params = new URLSearchParams(location.search);
  const isViewer = params.has('view') || params.get('mode') === 'view';
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const encoded = hash.get('d');

  console.log('Applying viewer from URL:', { isViewer, encoded: !!encoded }); // Debug log

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
      console.log('Decoded shared data:', data); // Debug log
      
      historyState.lock = true;
      applyProject(data);
      
      // CRITICAL FIX: Ensure slides are properly loaded after applying project
      if (data.slides && data.slides.length > 0) {
        import('./slide-manager.js').then(async ({ loadSlideIntoDOM, updateSlidesUI }) => {
          try {
            const activeIndex = Math.max(0, Math.min(data.activeIndex || 0, data.slides.length - 1));
            await loadSlideIntoDOM(data.slides[activeIndex]);
            updateSlidesUI();
            
            if (isViewer) {
              [...document.querySelectorAll('.layer')].forEach(el => el.setAttribute('contenteditable', 'false'));
            }
          } catch (error) {
            console.error('Error loading shared slide:', error);
          }
        });
      }
      
      historyState.lock = false;
      
    } catch (error) {
      console.warn('Failed to decode shared state:', error);
      toast('Invalid share link');
    }
  }
}

// Setup share button handler
export function setupShareHandler() {
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', shareCurrent);
  }
}

// Enhanced project building with better state capture
export function buildProjectForShare() {
  try {
    // Import current slide writer to ensure state is captured
    import('./slide-manager.js').then(({ writeCurrentSlide }) => {
      writeCurrentSlide();
    });
    
    return buildProject();
  } catch (error) {
    console.error('Error building project for share:', error);
    return buildProject(); // fallback
  }
}