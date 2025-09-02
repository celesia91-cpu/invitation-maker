// slide-manager.js - Fixed version with better async handling and race condition prevention

import { 
  getSlides, setSlides, getActiveIndex, setActiveIndex, 
  getPlaying, setPlaying, getRafId, setRafId, 
  getSlideStartTs, setSlideStartTs,
  saveProjectDebounced, updateUndoRedoUI
} from './state-manager.js';

import { clamp, DEFAULT_DUR } from './utils.js';
import { buildLayersFromDOM, loadLayersIntoDOM, updateTextFadeUI } from './text-manager.js';
import { 
  imgState, setTransforms, updateImageFadeUI 
} from './image-manager.js';

// Enhanced state tracking
let isSwitchingSlides = false;
let currentSwitchId = 0; // Unique ID for each switch operation
let pendingSwitchQueue = []; // Queue for pending switches instead of just one

/* ----------------------------- Helpers ---------------------------------- */

function getEls() {
  return {
    slidesStrip: document.getElementById('slidesStrip'),
    slideLabel: document.getElementById('slideLabel'),
    slideDur: document.getElementById('slideDur'),
    slideDurVal: document.getElementById('slideDurVal'),
    playBtn: document.getElementById('playSlidesBtn'),
    work: document.getElementById('work'),
    userBgWrap: document.getElementById('userBgWrap'),
    userBg: document.getElementById('userBg'),
  };
}

function currentSlide() {
  const s = getSlides();
  const i = getActiveIndex();
  return s[i];
}

function fmtSec(ms) {
  return ((ms || 0) / 1000).toFixed(1) + 's';
}

function ensureSlide(idx) {
  const s = getSlides();
  if (!s.length) {
    setSlides([{ image: null, layers: [], workSize: { w: 800, h: 450 }, durationMs: DEFAULT_DUR }]);
    setActiveIndex(0);
  } else if (idx != null) {
    setActiveIndex(clamp(idx, 0, s.length - 1) | 0);
  }
}

/* --------------------------- Enhanced Image Loading ----------------------------- */

// Store current image load operation to cancel if needed
let currentImageLoad = null;

function cancelCurrentImageLoad() {
  if (currentImageLoad) {
    currentImageLoad.cancelled = true;
    currentImageLoad = null;
  }
}

async function loadSlideImageSafely(slide, switchId) {
  const { userBg, work } = getEls();
  
  // Cancel any previous image load
  cancelCurrentImageLoad();
  
  const chosenSrc = slide?.image?.src || slide?.image?.thumb || '';
  if (!chosenSrc) {
    imgState.has = false;
    userBg.src = '';
    setTransforms();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    // Create load operation tracker
    const loadOp = { cancelled: false, switchId };
    currentImageLoad = loadOp;

    const onLoad = () => {
      // Check if this load was cancelled or superseded
      if (loadOp.cancelled || switchId !== currentSwitchId) {
        resolve(); // Resolve but don't apply changes
        return;
      }

      try {
        imgState.natW = userBg.naturalWidth;
        imgState.natH = userBg.naturalHeight;
        imgState.has = true;
        
        // CRITICAL FIX: Only use defaults if values are actually undefined/null
        const workRect = work.getBoundingClientRect();
        const centerX = workRect.width / 2;
        const centerY = workRect.height / 2;
        
        // Check if slide has saved image state, otherwise calculate defaults
        if (slide.image && typeof slide.image.scale === 'number') {
          // Use saved values
          imgState.scale = slide.image.scale;
          imgState.angle = slide.image.angle || 0;
          imgState.flip = !!slide.image.flip;
          imgState.cx = slide.image.cx || centerX;
          imgState.cy = slide.image.cy || centerY;
        } else {
          // Calculate initial size for new images
          const defaultScale = Math.min(
            workRect.width * 0.95 / imgState.natW, 
            workRect.height * 0.95 / imgState.natH
          );
          imgState.scale = defaultScale;
          imgState.angle = 0;
          imgState.flip = false;
          imgState.cx = centerX;
          imgState.cy = centerY;
        }
        
        setTransforms();
      } catch (error) {
        console.warn('Image load error:', error);
        imgState.has = false;
        setTransforms();
      }
      resolve();
    };

    const onError = () => {
      if (!loadOp.cancelled && switchId === currentSwitchId) {
        imgState.has = false;
        setTransforms();
      }
      resolve();
    };

    userBg.onload = onLoad;
    userBg.onerror = onError;
    userBg.src = chosenSrc;
  });
}

/* --------------------------- Enhanced Slide Loading ----------------------------- */

export async function loadSlideIntoDOM(s, switchId = null) {
  const { work } = getEls();
  
  // Set work dimensions
  work.style.setProperty('--work-w', (s?.workSize?.w || 800) + 'px');
  work.style.setProperty('--work-h', (s?.workSize?.h || 450) + 'px');

  // Clear existing text layers
  [...work.querySelectorAll('.layer')].forEach(n => n.remove());
  
  // Reset image state first
  imgState.has = false;
  
  // Load text layers
  loadLayersIntoDOM(s?.layers || []);

  // Load image with cancellation support
  await loadSlideImageSafely(s, switchId);
}

/* --------------------------- Improved Write Current Slide ----------------------------- */

export function writeCurrentSlide() {
  ensureSlide();
  const s = getSlides();
  const i = getActiveIndex();

  // Ensure we have a valid slide index
  if (i < 0 || i >= s.length) return;

  try {
    // Build text layers from DOM
    const layers = buildLayersFromDOM();

    // Build image object from current state - CRITICAL FIX: Always preserve current imgState
    const { userBg } = getEls();
    let image = null;
    if (imgState.has && userBg?.src) {
      // Always use current imgState values to preserve user transformations
      image = {
        src: userBg.src,
        thumb: makeThumbFromImgEl(userBg),
        cx: imgState.cx,           // Current position
        cy: imgState.cy,           // Current position  
        scale: imgState.scale,     // Current scale
        angle: imgState.angle,     // Current rotation
        flip: !!imgState.flip,     // Current flip state
        // Preserve existing fade settings if they exist
        fadeInMs: s[i]?.image?.fadeInMs || 0,
        fadeOutMs: s[i]?.image?.fadeOutMs || 0,
      };
    }

    // Preserve duration + workSize from existing slide
    const prev = s[i] || {};
    s[i] = {
      image,
      layers,
      workSize: prev.workSize || { w: 800, h: 450 },
      durationMs: prev.durationMs || DEFAULT_DUR
    };
    
    setSlides([...s]); // Create new array to ensure reactivity
    
    // Only save and update UI if not in the middle of switching
    if (!isSwitchingSlides) {
      saveProjectDebounced();
      updateSlidesUI();
    }
    
  } catch (error) {
    console.error('Error writing current slide:', error);
  }
}

// Make thumbnail with better error handling
function makeThumbFromImgEl(imgEl, maxW = 640, maxH = 640, quality = 0.72) {
  try {
    const src = String(imgEl?.src || '');
    if (!src.startsWith('data:')) return null;
    
    const imW = imgEl.naturalWidth || imgEl.width;
    const imH = imgEl.naturalHeight || imgEl.height;
    if (!imW || !imH) return null;

    const r = Math.min(maxW / imW, maxH / imH, 1);
    const w = Math.max(1, Math.round(imW * r));
    const h = Math.max(1, Math.round(imH * r));
    
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, w, h);
    
    return canvas.toDataURL('image/jpeg', quality);
  } catch (error) {
    console.warn('Thumbnail generation failed:', error);
    return null;
  }
}

/* --------------------------- Enhanced Slide Switching ----------------------------- */

export async function setActiveSlide(targetIndex) {
  // Normalize target index
  ensureSlide();
  const slides = getSlides();
  const normalizedIndex = clamp(targetIndex, 0, slides.length - 1);
  
  // If already at target slide, do nothing
  if (normalizedIndex === getActiveIndex() && !isSwitchingSlides) {
    return;
  }

  // If currently switching, queue this request
  if (isSwitchingSlides) {
    // Remove any existing queued request for the same index
    pendingSwitchQueue = pendingSwitchQueue.filter(idx => idx !== normalizedIndex);
    pendingSwitchQueue.push(normalizedIndex);
    return;
  }
  
  // Generate unique switch ID
  currentSwitchId += 1;
  const switchId = currentSwitchId;
  
  isSwitchingSlides = true;
  
  try {
    // CRITICAL FIX: Always save current slide state before switching, even during playback
    // This ensures image transformations are preserved
    writeCurrentSlide();
    
    // Small delay to ensure writeCurrentSlide completes
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Update active index
    setActiveIndex(normalizedIndex);
    
    // Get fresh slide data after writing current state
    const updatedSlides = getSlides();
    
    // Load new slide content with cancellation support
    await loadSlideIntoDOM(updatedSlides[normalizedIndex], switchId);
    
    // Only update UI if this switch wasn't superseded
    if (switchId === currentSwitchId) {
      updateSlidesUI();
    }
    
  } catch (error) {
    console.error('Error switching slides:', error);
  } finally {
    // Only clear switching state if this is the latest switch
    if (switchId === currentSwitchId) {
      isSwitchingSlides = false;
      
      // Process any queued switch requests
      if (pendingSwitchQueue.length > 0) {
        const nextIndex = pendingSwitchQueue.pop(); // Get the latest request
        pendingSwitchQueue = []; // Clear queue
        // Use setTimeout to avoid deep recursion
        setTimeout(() => setActiveSlide(nextIndex), 0);
      }
    }
  }
}

/* --------------------------- UI Updates ----------------------------- */

export function updateSlidesUI() {
  ensureSlide();
  const { slidesStrip, slideLabel, slideDur, slideDurVal } = getEls();
  const slides = getSlides();
  const active = getActiveIndex();

  if (!slidesStrip) return;

  // Render slides strip
  slidesStrip.innerHTML = '';
  slides.forEach((_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = 'S' + (i + 1);
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', i === active ? 'true' : 'false');
    
    // Use arrow function to capture index properly
    button.addEventListener('click', () => setActiveSlide(i));
    
    if (i === active) {
      button.classList.add('primary');
    }
    
    slidesStrip.appendChild(button);
  });

  // Update labels and controls
  if (slideLabel) {
    slideLabel.textContent = `Slide ${active + 1}/${slides.length}`;
  }

  const currentSlideData = slides[active];
  const duration = currentSlideData?.durationMs || DEFAULT_DUR;
  
  if (slideDur) {
    slideDur.value = duration;
  }
  if (slideDurVal) {
    slideDurVal.textContent = fmtSec(duration);
  }

  // Update fade controls
  updateTextFadeUI();
  updateImageFadeUI();
}

/* --------------------------- Navigation Functions ----------------------------- */

export async function previousSlide() {
  const currentIndex = getActiveIndex();
  await setActiveSlide(Math.max(0, currentIndex - 1));
}

export async function nextSlide() {
  const slides = getSlides();
  const currentIndex = getActiveIndex();
  await setActiveSlide(Math.min(slides.length - 1, currentIndex + 1));
}

/* --------------------------- Slide CRUD Operations ----------------------------- */

export function addSlide() {
  writeCurrentSlide(); // Save current state
  const slides = getSlides();
  const currentIndex = getActiveIndex();
  
  const newSlide = { 
    image: null, 
    layers: [], 
    workSize: { w: 800, h: 450 }, 
    durationMs: DEFAULT_DUR 
  };
  
  slides.splice(currentIndex + 1, 0, newSlide);
  setSlides([...slides]);
  setActiveSlide(currentIndex + 1);
}

export function duplicateSlide() {
  writeCurrentSlide(); // Save current state
  const slides = getSlides();
  const currentIndex = getActiveIndex();
  const currentSlideData = slides[currentIndex];
  
  if (!currentSlideData) return;
  
  // Deep clone the current slide
  const duplicatedSlide = JSON.parse(JSON.stringify(currentSlideData));
  slides.splice(currentIndex + 1, 0, duplicatedSlide);
  setSlides([...slides]);
  setActiveSlide(currentIndex + 1);
}

export function deleteSlide() {
  const slides = getSlides();
  const currentIndex = getActiveIndex();
  
  if (slides.length <= 1) return; // Don't delete the last slide
  
  slides.splice(currentIndex, 1);
  setSlides([...slides]);
  
  // Move to previous slide if we deleted the last one, otherwise stay at same index
  const newIndex = currentIndex >= slides.length ? slides.length - 1 : currentIndex;
  setActiveSlide(newIndex);
}

export function handleSlideDurationChange(value) {
  const ms = clamp(parseInt(value, 10) || DEFAULT_DUR, 500, 60000);
  const slides = getSlides();
  const currentIndex = getActiveIndex();
  
  if (!slides[currentIndex]) return;
  
  slides[currentIndex].durationMs = ms;
  setSlides([...slides]);
  saveProjectDebounced();
  updateSlidesUI();
}

/* --------------------------- Playback Functions ----------------------------- */

function computeOpacity(t, dur, fadeInMs, fadeOutMs) {
  const fi = Math.max(0, fadeInMs | 0);
  const fo = Math.max(0, fadeOutMs | 0);
  const a = fi > 0 ? Math.min(1, t / fi) : 1;
  const b = fo > 0 ? Math.min(1, (dur - t) / fo) : 1;
  return Math.max(0, Math.min(1, Math.min(a, b)));
}

export function resetOpacities() {
  const { work, userBgWrap } = getEls();
  [...work.querySelectorAll('.layer')].forEach(n => (n.style.opacity = '1'));
  if (userBgWrap) {
    userBgWrap.style.opacity = '1';
    userBgWrap.style.transition = '';
  }
}

async function stepFrame(ts) {
  const slides = getSlides();
  let currentIndex = getActiveIndex();
  const currentSlideData = slides[currentIndex];
  
  if (!currentSlideData) { 
    stopPlay(); 
    return; 
  }

  let slideStart = getSlideStartTs();
  if (!slideStart) { 
    setSlideStartTs(ts); 
    slideStart = ts; 
  }
  
  const elapsed = ts - slideStart;
  const duration = currentSlideData.durationMs || DEFAULT_DUR;

  // Apply fades
  const { work, userBgWrap } = getEls();

  // Text layers
  const domLayers = [...work.querySelectorAll('.layer')];
  domLayers.forEach((element, index) => {
    const layerData = currentSlideData.layers?.[index] || {};
    const opacity = computeOpacity(elapsed, duration, layerData.fadeInMs || 0, layerData.fadeOutMs || 0);
    element.style.opacity = String(opacity);
  });

  // Image
  const imageData = currentSlideData.image;
  if (imageData && userBgWrap) {
    const opacity = computeOpacity(elapsed, duration, imageData.fadeInMs || 0, imageData.fadeOutMs || 0);
    userBgWrap.style.opacity = String(opacity);
  }

  // Check if we should advance to the next slide
  if (elapsed >= duration) {
    const nextIndex = (currentIndex + 1) % slides.length;
    setActiveIndex(nextIndex);
    setSlideStartTs(ts);
    await loadSlideIntoDOM(slides[nextIndex]);
    updateSlidesUI();
  }

  // Continue animation
  const rafId = requestAnimationFrame(stepFrame);
  setRafId(rafId);
}

function startPlay() {
  if (getPlaying()) return;
  
  setPlaying(true);
  const { playBtn, userBgWrap } = getEls();
  
  if (playBtn) {
    playBtn.setAttribute('aria-pressed', 'true');
    playBtn.textContent = 'Stop';
  }
  
  // Disable CSS transition to let JS control fade durations precisely
  if (userBgWrap) {
    userBgWrap.style.transition = 'opacity 0ms linear';
  }

  setSlideStartTs(0);
  const rafId = requestAnimationFrame(stepFrame);
  setRafId(rafId);
}

function stopPlay() {
  if (!getPlaying()) return;
  
  setPlaying(false);
  
  const rafId = getRafId();
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  setRafId(0);
  
  const { playBtn } = getEls();
  if (playBtn) {
    playBtn.setAttribute('aria-pressed', 'false');
    playBtn.textContent = 'Play';
  }
  
  resetOpacities();
}

export function togglePlay() {
  if (getPlaying()) {
    stopPlay();
  } else {
    startPlay();
  }
}

/* --------------------------- Cleanup ----------------------------- */

// Cleanup function to call when the module is being destroyed
export function cleanup() {
  cancelCurrentImageLoad();
  stopPlay();
  isSwitchingSlides = false;
  pendingSwitchQueue = [];
  currentSwitchId = 0;
}

/* --------------------------- Initialization ----------------------------- */

// Ensure UI is updated when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateSlidesUI);
} else {
  updateSlidesUI();
}