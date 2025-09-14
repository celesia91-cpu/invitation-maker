// share-manager.js - COMPLETE FIXED VERSION WITH PROPER FUNCTION ORDERING

import { encodeState, decodeState, calculateViewportScale } from './utils.js';
import {
  buildProject,
  applyProject,
  setIsViewer,
  setCurrentProjectId,
  historyState,
  getSlides,
  getActiveIndex
} from './state-manager.js';
import { setImagePositionFromPercentage, setTransforms, imgState, syncImageCoordinates, getFxScale } from './image-manager.js';
import { ResponsiveManager } from './responsive-manager.js';

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

let lastViewportWidth = null;
let lastViewportHeight = null;
let viewerResponsiveManager = null;

export async function rescaleViewerContent() {
  try {
    if (typeof document === 'undefined' || !document.body.classList.contains('viewer')) return;

    const work = document.getElementById('work');
    if (!work) return;

    const rect = work.getBoundingClientRect();
    const viewportW = rect.width;
    const viewportH = rect.height;

    const slides = getSlides();
    const activeIndex = getActiveIndex();
    const slide = slides?.[activeIndex];
    if (!slide?.image) {
      lastViewportWidth = viewportW;
      lastViewportHeight = viewportH;
      return;
    }

    if (lastViewportWidth == null || lastViewportHeight == null) {
      lastViewportWidth = slide.image.originalWidth || viewportW;
      lastViewportHeight = slide.image.originalHeight || viewportH;
    }

    const { scaleX } = calculateViewportScale(
      viewportW,
      viewportH,
      lastViewportWidth,
      lastViewportHeight
    );

    if (Math.abs(scaleX - 1) > 0.001) {
      if (!viewerResponsiveManager) {
        viewerResponsiveManager = new ResponsiveManager();
        // Viewer mode doesn't need toolbar sync
        viewerResponsiveManager.syncToolbarAfterScaling = async () => {};
      }
      const prevCx = imgState.cx;
      const prevCy = imgState.cy;
      const prevScale = imgState.scale;
      await viewerResponsiveManager.scaleAllElements(scaleX);
      imgState.cx = prevCx;
      imgState.cy = prevCy;
      imgState.scale = prevScale;
    }

    lastViewportWidth = viewportW;
    lastViewportHeight = viewportH;

    setImagePositionFromPercentage(slide.image, false, 'cover');
    setTransforms(false);
  } catch (err) {
    console.error('Error rescaling viewer content:', err);
  }
}
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  document.addEventListener('fullscreenchange', rescaleViewerContent);
  window.addEventListener('resize', rescaleViewerContent);
}

async function loadSlideImage(slide) {
  if (!slide.image || !slide.image.src) return;

  const userBgEl = document.querySelector('#userBg');
  const work = document.querySelector('#work');

  if (!userBgEl || !work) return;

  return new Promise((resolve) => {
    userBgEl.onload = () => {
      try {
        const rect = work.getBoundingClientRect();

        imgState.natW = userBgEl.naturalWidth;
        imgState.natH = userBgEl.naturalHeight;

        // Check if we have percentage coordinates with viewport dimensions
        if (slide.image.cxPercent !== undefined &&
            slide.image.cyPercent !== undefined) {

          // Use the enhanced function that handles viewport scaling
          // Viewer defaults to 'cover' so images fill the viewport
          const baseScale = typeof slide.image.scale === 'number'
            ? slide.image.scale
            : getFxScale();
          setImagePositionFromPercentage({ ...slide.image, scale: baseScale }, false, 'cover');

        } else {
          // Fallback to absolute positioning
          const { scale: coverScale } = calculateViewportScale(
            rect.width,
            rect.height,
            imgState.natW,
            imgState.natH,
            'cover'
          );
          const defaultScale = Math.min(getFxScale(), coverScale);
          
          imgState.scale = typeof slide.image.scale === 'number'
            ? slide.image.scale
            : defaultScale;
            
          // Center the image
          imgState.cx = rect.width / 2;
          imgState.cy = rect.height / 2;
          imgState.angle = slide.image.angle || 0;
          imgState.shearX = slide.image.shearX || 0;
          imgState.shearY = slide.image.shearY || 0;
          imgState.signX = slide.image.signX || 1;
          imgState.signY = slide.image.signY || 1;
          imgState.flip = slide.image.flip || false;
        }

        imgState.has = true;
        setTransforms(false);
        syncImageCoordinates(true, slide);

      } catch (error) {
        console.error('Error positioning image:', error);
      }
      resolve();
    };

    userBgEl.onerror = () => {
      console.error('Failed to load image:', slide.image.src);
      resolve();
    };

    userBgEl.src = slide.image.src;
  });
}

// ENHANCED: Load text layers for shared project with responsive scaling
async function loadTextLayers(layers) {
  const work = document.querySelector('#work');
  if (!work || !layers.length) return;
  
  // Clear existing layers
  const existingLayers = work.querySelectorAll('.layer');
  existingLayers.forEach(layer => layer.remove());
  
  const workRect = work.getBoundingClientRect();

  // Add new layers with responsive scaling
  for (const layerData of layers) {
    const element = document.createElement('div');
    element.className = 'layer text-layer';
    element.contentEditable = 'false';
    element.textContent = layerData.text || 'Text';

    // Apply positioning and styles with viewport scaling using shared utility
    const { scaleX, scaleY, scale } = calculateViewportScale(
      workRect.width,
      workRect.height,
      layerData.workWidth || 1280,
      layerData.workHeight || 720,
      'cover'
    );

    element.style.left = (layerData.left * scaleX) + 'px';
    element.style.top = (layerData.top * scaleY) + 'px';
    element.style.fontSize = (layerData.fontSize * scale) + 'px';
    element.style.fontFamily = layerData.fontFamily || 'system-ui';
    element.style.fontWeight = layerData.fontWeight || 'normal';
    element.style.color = layerData.color || '#ffffff';
    element.style.textAlign = layerData.textAlign || 'left';

    if (layerData.transform) {
      element.style.transform = layerData.transform;
    }

    work.appendChild(element);
  }
  
  console.log('Text layers loaded and scaled for viewer');
}


// Enhanced fullscreen prompt
function showFullscreenPrompt() {
  console.log('Showing fullscreen prompt');
  
  const overlay = document.createElement('div');
  overlay.className = 'fs-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    background: linear-gradient(180deg, rgba(11,11,34,0.95), rgba(11,11,34,0.9));
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: fadeIn 0.3s ease;
  `;
  
  overlay.innerHTML = `
    <div class="fs-card" style="
      max-width: min(92vw, 480px);
      color: #eef1ff;
      background: rgba(17,20,50,0.8);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 18px;
      padding: 32px;
      box-shadow: 0 20px 25px rgba(0,0,0,0.1), inset 0 0 80px rgba(255,255,255,0.04);
      animation: slideUp 0.3s ease;
    ">
      <h2 style="margin: 0 0 12px; font-size: 24px; font-weight: 800;">View Invitation</h2>
      <p style="margin: 0 0 24px; color: #cfd2ff; line-height: 1.6;">
        For the best experience, we recommend viewing this invitation in fullscreen.
      </p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button onclick="
          document.documentElement.requestFullscreen().catch(console.log);
          this.parentElement.parentElement.parentElement.remove();
        " style="
          appearance: none;
          border: 0;
          cursor: pointer;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: white;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          box-shadow: 0 10px 30px rgba(37,99,235,0.3), 0 1px 0 rgba(255,255,255,0.2) inset;
          transition: all 0.15s ease;
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 12px 35px rgba(37,99,235,0.4), 0 1px 0 rgba(255,255,255,0.2) inset';"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 30px rgba(37,99,235,0.3), 0 1px 0 rgba(255,255,255,0.2) inset';">
          Enter Fullscreen
        </button>
        <button onclick="this.parentElement.parentElement.parentElement.remove();" style="
          appearance: none;
          border: 1px solid rgba(255,255,255,0.3);
          background: transparent;
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.15s ease;
        " onmouseover="this.style.background='rgba(255,255,255,0.1)';"
           onmouseout="this.style.background='transparent';">
          Continue in Window
        </button>
      </div>
      <div style="margin-top: 16px; font-size: 12px; color: rgba(207,210,255,0.7);">
        Press Escape to exit fullscreen anytime
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (overlay.parentElement) {
      overlay.remove();
      console.log('Fullscreen prompt auto-hidden');
    }
  }, 10000);
  
  // Handle fullscreen change events
  const handleFullscreenChange = () => {
    if (document.fullscreenElement) {
      console.log('Entered fullscreen mode');
      if (overlay.parentElement) overlay.remove();
    }
  };
  
  document.addEventListener('fullscreenchange', handleFullscreenChange, { once: true });
}

// Show viewer UI including fullscreen prompt and RSVP
function showViewerUI() {
  console.log('Setting up viewer UI...');
  
  // Show RSVP buttons
  const rsvp = document.querySelector('.rsvp');
  if (rsvp) {
    rsvp.style.display = 'flex';
    rsvp.style.visibility = 'visible';
    rsvp.style.opacity = '1';
    rsvp.classList.add('viewer-mode');
    console.log('RSVP buttons shown');
  }

  // Show fullscreen prompt if supported and not already in fullscreen
  if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
    setTimeout(() => {
      showFullscreenPrompt();
    }, 500); // Small delay for better UX
  }
}

// Show viewer error message
function showViewerError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(239, 68, 68, 0.9);
    color: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    z-index: 9999;
    font-family: system-ui, sans-serif;
    max-width: 400px;
  `;
  errorDiv.innerHTML = `
    <h3 style="margin: 0 0 10px; font-size: 18px;">Error Loading Invitation</h3>
    <p style="margin: 0; font-size: 14px; line-height: 1.4;">${message}</p>
  `;
  document.body.appendChild(errorDiv);
  
  // Auto-remove after 8 seconds
  setTimeout(() => errorDiv.remove(), 8000);
}

// ENHANCED: Apply shared project data with improved positioning
export async function applySharedProject(projectData) {
  if (!projectData || !projectData.slides) {
    console.warn('Invalid project data for sharing');
    return;
  }

  try {
    console.log('Applying shared project data...');
    
    // Process each slide
    for (const slide of projectData.slides) {
      if (slide.image) {
        await loadSlideImage(slide);
      }
      
      // Apply text layers
      if (slide.layers) {
        await loadTextLayers(slide.layers);
      }
    }
    
    console.log('Successfully applied shared project with enhanced positioning');
  } catch (error) {
    console.error('Failed to apply shared project:', error);
  }
}

// ENHANCED: Prepare project data for sharing with percentage-based positioning
export function safeProjectForShare(project) {
  const p = project ? JSON.parse(JSON.stringify(project)) : buildProject();
  
  p.slides = (p.slides || []).map((s) => {
    let img = null;
    if (s.image) {
      const {
        src,
        thumb,
        cx,
        cy,
        cxPercent,
        cyPercent,
        scale,
        angle,
        shearX,
        shearY,
        signX,
        signY,
        flip,
        fadeInMs,
        fadeOutMs,
        zoomInMs,
        zoomOutMs
      } = s.image;

      const isDataUrl = /^data:/i.test(src || '');
      
      // Prioritize percentage-based positioning for cross-device compatibility
      if (cxPercent !== undefined && cyPercent !== undefined) {
        img = {
          src: isDataUrl ? null : (src || null),
          thumb: thumb ?? null,
          // Use percentage coordinates for consistent cross-device positioning
          cxPercent: Math.round(cxPercent * 100) / 100, // Round to 2 decimal places
          cyPercent: Math.round(cyPercent * 100) / 100,
          scale: Math.round((scale ?? 1) * 1000) / 1000, // Round to 3 decimal places
          angle: Math.round((angle ?? 0) * 100) / 100,
          shearX: Math.round((shearX ?? 0) * 1000) / 1000,
          shearY: Math.round((shearY ?? 0) * 1000) / 1000,
          signX: signX === -1 ? -1 : undefined,
          signY: signY === -1 ? -1 : undefined,
          flip: flip ? true : undefined,
          fadeInMs,
          fadeOutMs,
          zoomInMs,
          zoomOutMs
        };
      } else {
        // Fallback to absolute coordinates (legacy support)
        img = {
          src: isDataUrl ? null : (src || null),
          thumb: thumb ?? null,
          cx: cx ?? 0,
          cy: cy ?? 0,
          scale: scale ?? 1,
          angle: angle ?? 0,
          shearX: shearX ?? 0,
          shearY: shearY ?? 0,
          signX: signX ?? 1,
          signY: signY ?? 1,
          flip: !!flip,
          fadeInMs,
          fadeOutMs,
          zoomInMs,
          zoomOutMs
        };
      }
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
    try {
      const { writeCurrentSlide } = await import('./slide-manager.js');
      if (writeCurrentSlide) {
        writeCurrentSlide();
      }
    } catch (error) {
      console.warn('Could not import slide-manager:', error);
    }

    // Ensure active slide has up-to-date image coordinates
    syncImageCoordinates(true);

    // Small delay allows layout/state microtasks to flush
    await new Promise((resolve) => setTimeout(resolve, 50));

    const url = buildViewerUrl();
    
    // Validate URL length
    if (url.length > 8000) {
      console.warn('Share URL is very long and may not work in all browsers');
    }

    const shareData = {
      title: 'Invitation',
      text: "You're invited! Open the link to view the invitation.",
      url
    };

    console.log('Sharing URL with enhanced positioning:', url);

    // Try native sharing first
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (shareError) {
        console.warn('Native share failed:', shareError);
        // Fall through to clipboard
      }
    }

    // Try clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        // Check permissions if available
        if (navigator.permissions) {
          const perm = await navigator.permissions.query({ name: 'clipboard-write' });
          if (perm.state === 'denied') {
            manualCopy(url);
            return;
          }
        }
        
        await navigator.clipboard.writeText(url);
        console.log('Link copied to clipboard');
        return;
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    }

    // Fallback to manual copy
    manualCopy(url);
    
  } catch (error) {
    console.error('Share failed:', error);
    // Still try to show the URL to user
    try {
      const fallbackUrl = buildViewerUrl();
      manualCopy(fallbackUrl);
    } catch (fallbackError) {
      console.error('Complete share failure:', fallbackError);
      alert('Unable to share. Please try refreshing the page.');
    }
  }
}

function manualCopy(url) {
  console.warn('Prompting user to copy link manually.');
  try {
    window.prompt('Copy this link:', url);
  } catch (err) {
    console.warn('Prompt failed:', err);
  }
  console.log('Copy the link manually');
}

// ENHANCED: Apply viewer mode from URL parameters with better error handling
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
    document.body.classList.add('viewer');

    // Initialize responsive behavior in viewer mode so resize observers and
    // safe-area handling remain active
    try {
      const rm = new ResponsiveManager();
      rm.initialize();
    } catch (err) {
      console.error('ResponsiveManager failed to initialize in viewer mode:', err);
    }

    // Disable editor-centric shortcuts in viewer
    window.addEventListener('keydown', (e) => {
      const k = e.key?.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'z' || k === 'y')) {
        e.preventDefault();
      }
    });

    // Hide editor affordances and setup viewer UI
    import('./ui-manager.js').then(({ syncTopbarHeight, enterPreview, setupViewerMode }) => {
      try { 
        syncTopbarHeight(); 
      } catch {}
      try { 
        enterPreview(); 
      } catch {}
      try {
        if (setupViewerMode) setupViewerMode();
      } catch {}
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

      // ENHANCED: Load with improved positioning and UI
      if (data.slides && data.slides.length > 0) {
        setTimeout(async () => {
          try {
            const activeIndex = Math.max(0, Math.min(data.activeIndex || 0, data.slides.length - 1));
            
            // Apply the shared project data with enhanced positioning
            await applySharedProject(data);
            
            // Load the active slide with enhanced positioning
            await loadSlideImage(data.slides[activeIndex]);
            syncImageCoordinates();
            
            // Load text layers if present
            if (data.slides[activeIndex].layers) {
              await loadTextLayers(data.slides[activeIndex].layers);
            }

            if (isViewer) {
              // Setup viewer UI
              showViewerUI();
              
              // Start playback if needed
              try {
                const { startPlay } = await import('./slide-manager.js');
                if (startPlay) startPlay();
              } catch {}
              
              // Ensure layers are not editable
              [...document.querySelectorAll('.layer')].forEach((el) =>
                el.setAttribute('contenteditable', 'false')
              );
            }
          } catch (error) {
            console.error('Error loading shared slide:', error);
          }
        }, 100);
      }

      historyState.lock = false;
    } catch (error) {
      console.warn('Failed to decode shared state:', error);
      
      // Show user-friendly error in viewer mode
      if (isViewer) {
        showViewerError('Invalid share link. Please check the URL and try again.');
      }
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

// ENHANCED: Debug functions for sharing
export function debugSharedProject() {
  try {
    const project = safeProjectForShare();
    console.log('Shared Project Debug:', {
      slides: project.slides?.length || 0,
      activeIndex: project.activeIndex,
      hasPercentageCoords: project.slides?.some(s => 
        s.image?.cxPercent !== undefined
      ),
      firstSlideImage: project.slides?.[0]?.image,
      encodedLength: encodeState(project).length
    });
  } catch (error) {
    console.error('Failed to debug shared project:', error);
  }
}

// Make debug functions available globally for troubleshooting
if (typeof window !== 'undefined') {
  window.debugSharedProject = debugSharedProject;
  window.safeProjectForShare = safeProjectForShare;
  window.applySharedProject = applySharedProject;
  window.loadSlideImage = loadSlideImage;
  window.loadTextLayers = loadTextLayers;
  window.showViewerUI = showViewerUI;
  window.showFullscreenPrompt = showFullscreenPrompt;
  window.rescaleViewerContent = rescaleViewerContent;
}