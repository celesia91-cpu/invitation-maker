// share-manager.js - COMPLETE ENHANCED VERSION WITH PERCENTAGE-BASED POSITIONING

import { encodeState, decodeState } from './utils.js';
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
        console.log('Link copied to clipboard ✓');
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

// ENHANCED: Load slide image with percentage positioning support
async function loadSlideImage(slide) {
  if (!slide.image || !slide.image.src) return;
  
  const userBgEl = document.querySelector('#userBg');
  if (!userBgEl) return;

  return new Promise((resolve) => {
    userBgEl.onload = async () => {
      try {
        const { imgState, setImagePositionFromPercentage, setTransforms } = await import('./image-manager.js');
        
        imgState.has = true;
        imgState.natW = userBgEl.naturalWidth;
        imgState.natH = userBgEl.naturalHeight;
        
        const work = document.querySelector('#work');
        if (!work) {
          resolve();
          return;
        }

        // Check if we have percentage-based coordinates (new format)
        if (slide.image.cxPercent !== undefined && slide.image.cyPercent !== undefined) {
          console.log('📍 Loading with percentage-based positioning');
          
          // Use percentage-based positioning for consistent cross-device display
          setImagePositionFromPercentage({
            cxPercent: slide.image.cxPercent,
            cyPercent: slide.image.cyPercent,
            scale: slide.image.scale || 1,
            angle: slide.image.angle || 0,
            shearX: slide.image.shearX || 0,
            shearY: slide.image.shearY || 0,
            signX: slide.image.signX || 1,
            signY: slide.image.signY || 1,
            flip: slide.image.flip || false
          });
          
        } else {
          console.log('📍 Loading with legacy absolute positioning');
          
          // Fallback to absolute positioning (legacy format)
          const rect = work.getBoundingClientRect();
          
          // Try to detect if coordinates are from a different sized work area
          const isLegacyCoords = (slide.image.cx > rect.width * 2) || (slide.image.cy > rect.height * 2);
          
          if (isLegacyCoords) {
            // Assume legacy coordinates were from a standard work area size
            // Common editor sizes: 1280x720 or similar 16:9 ratios
            const assumedLegacyWidth = 1280;
            const assumedLegacyHeight = 720;
            
            const scaleX = rect.width / assumedLegacyWidth;
            const scaleY = rect.height / assumedLegacyHeight;
            
            imgState.cx = (slide.image.cx || assumedLegacyWidth / 2) * scaleX;
            imgState.cy = (slide.image.cy || assumedLegacyHeight / 2) * scaleY;
            
            console.log('🔧 Scaled legacy coordinates:', { 
              original: { cx: slide.image.cx, cy: slide.image.cy },
              scaled: { cx: imgState.cx, cy: imgState.cy },
              factors: { scaleX, scaleY }
            });
          } else {
            // Use coordinates as-is (should work for similar sized work areas)
            imgState.cx = slide.image.cx || rect.width / 2;
            imgState.cy = slide.image.cy || rect.height / 2;
          }
          
          // Apply other transform properties
          imgState.scale = slide.image.scale || 1;
          imgState.angle = slide.image.angle || 0;
          imgState.shearX = slide.image.shearX || 0;
          imgState.shearY = slide.image.shearY || 0;
          imgState.signX = slide.image.signX || 1;
          imgState.signY = slide.image.signY || 1;
          imgState.flip = slide.image.flip || false;
          
          setTransforms();
        }
        
        // Apply image effects if present
        if (slide.image.fadeInMs) imgState.fadeInMs = slide.image.fadeInMs;
        if (slide.image.fadeOutMs) imgState.fadeOutMs = slide.image.fadeOutMs;
        if (slide.image.zoomInMs) imgState.zoomInMs = slide.image.zoomInMs;
        if (slide.image.zoomOutMs) imgState.zoomOutMs = slide.image.zoomOutMs;
        
        console.log('✅ Image loaded and positioned for viewer');
        resolve();
        
      } catch (error) {
        console.error('Error setting up loaded image:', error);
        resolve();
      }
    };
    
    userBgEl.onerror = () => {
      console.error('Failed to load shared image:', slide.image.src);
      resolve();
    };
    
    // Trigger load
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
  
  console.log('✅ Text layers loaded and scaled for viewer');
}

// ENHANCED: Apply shared project data with improved positioning
export async function applySharedProject(projectData) {
  if (!projectData || !projectData.slides) {
    console.warn('Invalid project data for sharing');
    return;
  }

  try {
    console.log('📋 Applying shared project data...');
    
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
    
    console.log('✅ Successfully applied shared project with enhanced positioning');
  } catch (error) {
    console.error('Failed to apply shared project:', error);
  }
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

      // ENHANCED: Apply shared project with improved positioning
      if (data.slides && data.slides.length > 0) {
        import('./slide-manager.js').then(async ({ loadSlideIntoDOM, updateSlidesUI, startPlay }) => {
          try {
            const activeIndex = Math.max(0, Math.min(data.activeIndex || 0, data.slides.length - 1));
            
            // Apply the shared project data with enhanced positioning
            await applySharedProject(data);
            
            // Load the active slide
            await loadSlideIntoDOM(data.slides[activeIndex]);
            updateSlidesUI();

            if (isViewer) {
              startPlay();
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
      console.error('Invalid share link');
      
      // Show user-friendly error in viewer mode
      if (isViewer) {
        showViewerError('Invalid share link. Please check the URL and try again.');
      }
    }
  }
}

// ENHANCED: Setup viewer layout for consistent positioning
function setupViewerLayout() {
  const body = document.body;
  const wrap = document.querySelector('.wrap');
  const stage = document.querySelector('.stage');
  
  // Apply viewer-specific layout styles
  if (stage) {
    stage.style.minHeight = '100vh';
    stage.style.padding = '0';
    stage.style.display = 'flex';
    stage.style.alignItems = 'center';
    stage.style.justifyContent = 'center';
  }
  
  if (wrap) {
    // Maintain aspect ratio for consistent coordinate system
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // Mobile: use full screen
      wrap.style.width = '100vw';
      wrap.style.height = '100vh';
      wrap.style.borderRadius = '0';
      wrap.style.aspectRatio = 'auto';
    } else {
      // Desktop: maintain 16:9 aspect ratio for consistent positioning
      wrap.style.width = 'min(100vw, calc(100vh * 16/9))';
      wrap.style.height = 'min(100vh, calc(100vw * 9/16))';
      wrap.style.aspectRatio = '16 / 9';
      wrap.style.position = 'static';
      wrap.style.transform = 'none';
    }
  }
  
  console.log('📱 Viewer layout configured');
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
    console.log('🔍 Shared Project Debug:', {
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
      console.log('✅ Emergency image centering applied');
    }
  };
  
  window.debugCurrentPositioning = function() {
    const work = document.querySelector('#work');
    const userBgWrap = document.querySelector('#userBgWrap');
    const fxVideo = document.querySelector('#fxVideo');
    
    if (work && userBgWrap && fxVideo) {
      console.log('🔍 Current Positioning Debug:', {
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