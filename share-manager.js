// share-manager.js - COMPLETE FIXED VERSION WITH PROPER FUNCTION ORDERING

import { encodeState, decodeState } from './utils.js';
import {
  buildProject,
  applyProject,
  setIsViewer,
  setCurrentProjectId,
  historyState
} from './state-manager.js';
import { getFxScale } from './image-manager.js';

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

// Apply image positioning directly to wrapper element
function applyImagePositioning(element, params) {
  const { 
    centerX, centerY, scale, naturalWidth, naturalHeight,
    angle, shearX, shearY, flip, signX, signY
  } = params;
  
  const displayWidth = naturalWidth * scale;
  const displayHeight = naturalHeight * scale;
  
  const sx = (flip ? -1 : 1) * (signX || 1);
  const sy = signY || 1;
  
  const transform = [
    'translate(-50%, -50%)',
    `rotate(${angle || 0}rad)`,
    `skew(${shearX || 0}rad, ${shearY || 0}rad)`,
    `scale(${sx}, ${sy})`
  ].join(' ');

  // Apply styles directly
  element.style.width = displayWidth + 'px';
  element.style.height = displayHeight + 'px';
  element.style.left = centerX + 'px';
  element.style.top = centerY + 'px';
  element.style.transform = transform;
  element.style.transformOrigin = 'center center';
  element.style.zIndex = '15';
  element.style.position = 'absolute';
  
  console.log('Applied positioning:', {
    center: { x: Math.round(centerX), y: Math.round(centerY) },
    size: { width: Math.round(displayWidth), height: Math.round(displayHeight) },
    transform: transform
  });
}

// Fix for the loadSlideImage function in share-manager.js
// Replace the existing coordinate conversion logic with this:

async function loadSlideImage(slide) {
  if (!slide.image || !slide.image.src) return;
  
  const userBgEl = document.querySelector('#userBg');
  const userBgWrap = document.querySelector('#userBgWrap');
  const work = document.querySelector('#work');
  
  if (!userBgEl || !userBgWrap || !work) return;

  return new Promise((resolve) => {
    userBgEl.onload = () => {
      try {
        const workRect = work.getBoundingClientRect();
        const naturalWidth = userBgEl.naturalWidth;
        const naturalHeight = userBgEl.naturalHeight;
        
        console.log('Loading image:', {
          naturalSize: { width: naturalWidth, height: naturalHeight },
          workArea: { width: workRect.width, height: workRect.height },
          imageData: slide.image
        });

        const defaultScale = Math.min(
          getFxScale(),
          workRect.width / naturalWidth,
          workRect.height / naturalHeight
        );
        let finalX, finalY, finalScale = defaultScale;

        // Check if we have percentage coordinates (new format)
        if (slide.image.cxPercent !== undefined && slide.image.cyPercent !== undefined) {
          console.log('Using percentage positioning');

          finalX = (slide.image.cxPercent / 100) * workRect.width;
          finalY = (slide.image.cyPercent / 100) * workRect.height;
          if (typeof slide.image.scale === 'number') finalScale = slide.image.scale;

        } else if (slide.image.cx !== undefined && slide.image.cy !== undefined) {
          console.log('Using legacy absolute coordinates - applying smart scaling');
          
          const sourceCoords = { cx: slide.image.cx, cy: slide.image.cy };
          
          // FIXED: More robust coordinate validation and centering logic
          const isValidCoordinate = (coord, max) => coord >= 0 && coord <= max && !isNaN(coord);
          
          // Common editor sizes for detection
          const commonSizes = [
            { w: 1920, h: 1080 },  // Full HD 16:9  
            { w: 1280, h: 720 },   // Standard 16:9
            { w: 1024, h: 576 },   // Smaller 16:9
            { w: 800, h: 450 },    // Even smaller 16:9
            { w: 1000, h: 1000 },  // Square format
            { w: 1007, h: 1000 },  // Current work area from console
          ];
          
          let bestMatch = null;
          let bestScore = Infinity;
          
          // Find most likely source size with improved scoring
          for (const size of commonSizes) {
            if (isValidCoordinate(sourceCoords.cx, size.w) && 
                isValidCoordinate(sourceCoords.cy, size.h)) {
              
              // Score based on how centered the coordinates are
              const centerDistance = Math.abs(sourceCoords.cx - size.w/2) + 
                                   Math.abs(sourceCoords.cy - size.h/2);
              const normalizedScore = centerDistance / (size.w + size.h); // Normalize by size
              
              if (normalizedScore < bestScore) {
                bestScore = normalizedScore;
                bestMatch = size;
              }
            }
          }
          
          if (bestMatch && bestScore < 0.5) { // Only use if reasonably centered
            console.log('Detected source work area:', bestMatch);
            
            // Convert to percentage and scale to current work area
            const sourceXPercent = (sourceCoords.cx / bestMatch.w) * 100;
            const sourceYPercent = (sourceCoords.cy / bestMatch.h) * 100;
            
            finalX = (sourceXPercent / 100) * workRect.width;
            finalY = (sourceYPercent / 100) * workRect.height;
            if (typeof slide.image.scale === 'number') {
              finalScale = slide.image.scale;
            }
            
            console.log('Converted coordinates:', {
              source: sourceCoords,
              sourceSize: bestMatch,
              sourcePercent: { x: sourceXPercent.toFixed(1), y: sourceYPercent.toFixed(1) },
              final: { x: Math.round(finalX), y: Math.round(finalY) }
            });
          } else {
            // FIXED: Force centering for invalid/suspicious coordinates
            console.log('Centering image - coordinates invalid or not centered enough');
            finalX = workRect.width / 2;
            finalY = workRect.height / 2;
            if (typeof slide.image.scale === 'number') {
              finalScale = slide.image.scale;
            }
            
            console.log('Applied centering:', {
              center: { x: Math.round(finalX), y: Math.round(finalY) },
              workArea: { width: workRect.width, height: workRect.height }
            });
          }
        } else {
          console.log('No positioning data - centering and auto-scaling');

          // FIXED: Ensure proper centering
          finalX = workRect.width / 2;
          finalY = workRect.height / 2;

          if (typeof slide.image.scale === 'number') {
            finalScale = slide.image.scale;
          }
        }

        // FIXED: Validate final coordinates before applying
        if (isNaN(finalX) || isNaN(finalY) || isNaN(finalScale)) {
          console.warn('Invalid final coordinates, forcing center');
          finalX = workRect.width / 2;
          finalY = workRect.height / 2;
          finalScale = 1;
        }

        // Apply the positioning directly to userBgWrap
        applyImagePositioning(userBgWrap, {
          centerX: finalX,
          centerY: finalY,
          scale: finalScale,
          naturalWidth,
          naturalHeight,
          angle: slide.image.angle || 0,
          shearX: slide.image.shearX || 0,
          shearY: slide.image.shearY || 0,
          flip: slide.image.flip || false,
          signX: slide.image.signX || 1,
          signY: slide.image.signY || 1
        });

        console.log('Image positioned successfully at:', Math.round(finalX), Math.round(finalY));
        resolve();
        
      } catch (error) {
        console.error('Error positioning image:', error);
        resolve();
      }
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
    
    // Apply positioning and styles with viewport scaling
    const scaleFactorX = workRect.width / (layerData.workWidth || 1280);
    const scaleFactorY = workRect.height / (layerData.workHeight || 720);
    const scaleFactor = Math.min(scaleFactorX, scaleFactorY);
    
    element.style.left = (layerData.left * scaleFactorX) + 'px';
    element.style.top = (layerData.top * scaleFactorY) + 'px';
    element.style.fontSize = (layerData.fontSize * scaleFactor) + 'px';
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

// ENHANCED: Setup viewer layout for consistent positioning
function setupViewerLayout() {
  const body = document.body;
  const stage = document.querySelector('.stage');
  const wrap = document.querySelector('.wrap');
  
  console.log('Setting up viewer layout...');
  
  // Force viewer body styles
  body.style.paddingTop = '0';
  body.style.paddingLeft = '0';
  body.style.margin = '0';
  body.style.overflow = 'hidden';

  // Setup stage for proper centering
  if (stage) {
    stage.style.minHeight = '100vh';
    stage.style.height = '100vh';
    stage.style.padding = '0';
    stage.style.display = 'flex';
    stage.style.alignItems = 'center';
    stage.style.justifyContent = 'center';
  }
  
  if (wrap) {
    // Calculate proper dimensions maintaining 16:9 aspect ratio
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetAspect = 16 / 9;
    const viewportAspect = vw / vh;

    let wrapWidth, wrapHeight;
    
    // Determine dimensions based on viewport aspect ratio
    if (viewportAspect > targetAspect) {
      // Viewport is wider than 16:9, constrain by height
      wrapHeight = vh;
      wrapWidth = vh * targetAspect;
    } else {
      // Viewport is taller than 16:9, constrain by width
      wrapWidth = vw;
      wrapHeight = vw / targetAspect;
    }

    // Apply the calculated dimensions
    wrap.style.width = wrapWidth + 'px';
    wrap.style.height = wrapHeight + 'px';
    wrap.style.aspectRatio = '16 / 9';
    wrap.style.borderRadius = '0';
    wrap.style.boxShadow = 'none';
    wrap.style.position = 'relative';
    wrap.style.transform = 'none';
    wrap.style.maxWidth = 'none';
    wrap.style.maxHeight = 'none';

    console.log('Viewer dimensions set:', { 
      viewport: { width: vw, height: vh },
      wrap: { width: wrapWidth, height: wrapHeight },
      aspectRatio: targetAspect
    });
  }

  // Setup work area
  const work = document.querySelector('#work');
  if (work) {
    work.style.position = 'absolute';
    work.style.inset = '0';
    work.style.width = '100%';
    work.style.height = '100%';
    work.style.borderRadius = 'inherit';
  }

  // Handle window resize for viewer
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (document.body.classList.contains('viewer')) {
        setupViewerLayout();
        // Re-position image after layout change
        setTimeout(() => {
          const slides = window.stateManager?.slides || [];
          if (slides.length > 0 && slides[0].image) {
            loadSlideImage(slides[0]);
          }
        }, 50);
      }
    }, 250);
  });
  
  console.log('Viewer layout configured');
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
    const body = document.body;
    body.classList.add('viewer');

    // Apply viewer-specific CSS for consistent positioning
    setupViewerLayout();

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
  window.applyImagePositioning = applyImagePositioning;
  window.setupViewerLayout = setupViewerLayout;
  window.showViewerUI = showViewerUI;
  window.showFullscreenPrompt = showFullscreenPrompt;
  
  // Emergency fix functions for console debugging
  window.fixImageCentering = function() {
    const work = document.querySelector('#work');
    const userBgWrap = document.querySelector('#userBgWrap');
    if (work && userBgWrap) {
      const rect = work.getBoundingClientRect();
      userBgWrap.style.left = (rect.width / 2) + 'px';
      userBgWrap.style.top = (rect.height / 2) + 'px';
      userBgWrap.style.zIndex = '15';
      console.log('Emergency image centering applied');
    }
  };
  
  window.debugCurrentPositioning = function() {
    const work = document.querySelector('#work');
    const userBgWrap = document.querySelector('#userBgWrap');
    const fxVideo = document.querySelector('#fxVideo');
    
    if (work && userBgWrap && fxVideo) {
      console.log('Current Positioning Debug:', {
        workArea: work.getBoundingClientRect(),
        imageWrapper: userBgWrap.getBoundingClientRect(),
        fxVideo: fxVideo.getBoundingClientRect(),
        imageStyles: {
          left: userBgWrap.style.left,
          top: userBgWrap.style.top,
          width: userBgWrap.style.width,
          height: userBgWrap.style.height,
          transform: userBgWrap.style.transform,
          zIndex: userBgWrap.style.zIndex
        }
      });
    }
  };
}