// share-manager.js - Fixed sharing functionality

import { encodeState, decodeState, toast } from './utils.js';
import {
  buildProject,
  applyProject,
  setIsViewer,
  setCurrentProjectId,
  historyState
} from './state-manager.js';

// Prefer a canonical viewer origin in production so shared links always open the public viewer.
// Fallback to current origin if you're already on the viewer.
const CANONICAL_VIEWER_ORIGIN = 'https://celesia.app';
function getViewerOrigin() {
  try {
    const here = location.origin;
    // If we're already on the canonical domain (or a preview of it), keep it.
    if (here === CANONICAL_VIEWER_ORIGIN || here.endsWith('.celesia.app')) return here;
    return CANONICAL_VIEWER_ORIGIN;
  } catch {
    return CANONICAL_VIEWER_ORIGIN;
  }
}

// Prepare project data for sharing (trim huge inline images, keep remote URLs)
export function safeProjectForShare() {
  const p = buildProject();
  p.slides = (p.slides || []).map((s) => {
    const img = s.image ? { ...s.image } : null;
    if (img) {
      const src = img.src || '';
      const isRemote = /^https?:\/\//i.test(src);
      const isDataUrl = /^data:/i.test(src);

      // Keep remote URLs always (R2, CDN, etc.). Strip only data URLs to avoid giant hashes.
      if (isDataUrl) {
        img.src = null;
      }

      // Don't touch thumb/transformations — viewer needs these.
      // If both src and thumb end up null, the viewer will just show no image for that slide.
    }
    return { ...s, image: img };
  });
  return p;
}

// Build viewer URL with encoded project data
export function buildViewerUrl() {
  const payload = encodeState(safeProjectForShare());

  // Build against canonical viewer origin so links are shareable from anywhere (localhost, Pages, etc.)
  const url = new URL('/', getViewerOrigin());
  url.searchParams.set('view', '1');
  url.hash = 'd=' + payload;

  // (Optional) warn if the URL is huge (e.g., many slides or lots of text)
  if (url.toString().length > 3500) {
    console.warn('Share URL is quite long (~' + url.toString().length + ' chars). Consider reducing slide content.');
  }
  return url.toString();
}

// Share current project with proper state capture
export async function shareCurrent() {
  try {
    // Ensure current DOM state is captured before sharing
    const { writeCurrentSlide } = await import('./slide-manager.js');
    writeCurrentSlide();

    // Small delay allows layout/state microtasks to flush
    await new Promise((resolve) => setTimeout(resolve, 50));

    const url = buildViewerUrl();
    const shareData = {
      title: 'Invitation',
      text: "You're invited! Open the link to view the invitation.",
      url
    };

    console.log('Sharing URL:', url);

    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard && window.isSecureContext) {
      try {
        const perm = await navigator.permissions?.query({ name: 'clipboard-write' });
        if (!perm || perm.state === 'granted' || perm.state === 'prompt') {
          await navigator.clipboard.writeText(url);
          toast('Link copied ✓');
        } else {
          manualCopy(url);
        }
      } catch (err) {
        console.warn('Clipboard write failed:', err);
        manualCopy(url);
      }
    } else {
      manualCopy(url);
    }
  } catch (error) {
    console.error('Share failed:', error);
    toast('Share failed');
  }
}

function manualCopy(url) {
  console.warn('Prompting user to copy link manually.');
  try {
    window.prompt('Copy this link:', url);
  } catch (err) {
    console.warn('Prompt failed:', err);
  }
  toast('Copy the link manually');
}

// Apply viewer mode from URL parameters
export function applyViewerFromUrl() {
  const params = new URLSearchParams(location.search);
  const isViewer = params.has('view') || params.get('mode') === 'view';

  // Support both "#d=..." and "?d=..." encodings
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const encoded = hash.get('d') || params.get('d');

  console.log('Applying viewer from URL:', { isViewer, encoded: !!encoded });

  if (isViewer) {
    setIsViewer(true);
    setCurrentProjectId(null); // hard reset; prevents any backend saves with stale ids
    const body = document.body;
    body.classList.add('viewer');

    // Disable editor-centric shortcuts in viewer
    window.addEventListener('keydown', (e) => {
      const k = e.key?.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'z' || k === 'y')) {
        e.preventDefault();
      }
    });

    // Hide editor affordances
    import('./ui-manager.js').then(({ syncTopbarHeight, enterPreview }) => {
      try { syncTopbarHeight(); } catch {}
      try { enterPreview(); } catch {}
    });

    // Ensure any present layers are not editable
    [...document.querySelectorAll('.layer')].forEach((el) =>
      el.setAttribute('contenteditable', 'false')
    );
  }

  if (encoded) {
    try {
      const data = decodeState(encoded);
      console.log('Decoded shared data:', data);

      historyState.lock = true;
      applyProject(data);

      // Ensure slides render after applying project
      if (data.slides && data.slides.length > 0) {
        import('./slide-manager.js').then(async ({ loadSlideIntoDOM, updateSlidesUI }) => {
          try {
            const activeIndex = Math.max(0, Math.min(data.activeIndex || 0, data.slides.length - 1));
            await loadSlideIntoDOM(data.slides[activeIndex]);
            updateSlidesUI();

            if (isViewer) {
              [...document.querySelectorAll('.layer')].forEach((el) =>
                el.setAttribute('contenteditable', 'false')
              );
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

// (Optional) helper if you want to capture again elsewhere before sharing
export function buildProjectForShare() {
  try {
    import('./slide-manager.js').then(({ writeCurrentSlide }) => {
      writeCurrentSlide();
    });
    return buildProject();
  } catch (error) {
    console.error('Error building project for share:', error);
    return buildProject(); // fallback
  }
}
