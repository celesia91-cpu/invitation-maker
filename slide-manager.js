// slide-manager.js - Simplified version with reliable concurrency control

import { 
  getSlides, setSlides, getActiveIndex, setActiveIndex, 
  getPlaying, setPlaying, getRafId, setRafId, 
  getSlideStartTs, setSlideStartTs,
  saveProjectDebounced, updateUndoRedoUI
} from './state-manager.js';

import { clamp, DEFAULT_DUR, fmtSec } from './utils.js';
import { buildLayersFromDOM, loadLayersIntoDOM, updateTextFadeUI } from './text-manager.js';
import { 
  imgState, setTransforms, updateImageFadeUI 
} from './image-manager.js';

/**
 * Simplified Slide Switching Manager
 * Uses a single Promise-based queue to prevent race conditions
 */
class SlideSwitchManager {
  constructor() {
    this.currentSwitch = null; // Single active switch promise
    this.isDestroyed = false;
  }

  /**
   * Switch to target slide with automatic queuing
   */
  async switchToSlide(targetIndex) {
    // Normalize target index
    const slides = getSlides();
    const normalizedIndex = clamp(targetIndex, 0, slides.length - 1);
    
    // If already at target slide, do nothing
    if (normalizedIndex === getActiveIndex()) {
      return;
    }

    // If there's an active switch, wait for it to complete
    if (this.currentSwitch) {
      try {
        await this.currentSwitch;
      } catch (error) {
        console.warn('Previous slide switch failed:', error);
      }
    }

    // Start new switch
    this.currentSwitch = this.performSlideSwitch(normalizedIndex);
    
    try {
      await this.currentSwitch;
    } finally {
      this.currentSwitch = null;
    }
  }

  /**
   * Perform the actual slide switch
   */
  async performSlideSwitch(targetIndex) {
    if (this.isDestroyed) return;

    try {
      // Save current slide state
      writeCurrentSlide();
      
      // Small delay to ensure DOM updates complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Update active index
      setActiveIndex(targetIndex);
      
      // Load new slide content
      const slides = getSlides();
      await loadSlideIntoDOM(slides[targetIndex]);
      
      // Update UI
      updateSlidesUI();
      
    } catch (error) {
      console.error('Slide switch failed:', error);
      // Attempt recovery by updating UI anyway
      updateSlidesUI();
      throw error;
    }
  }

  /**
   * Check if currently switching
   */
  isSwitching() {
    return !!this.currentSwitch;
  }

  /**
   * Force clear any pending switches (for cleanup)
   */
  clearPendingSwitches() {
    this.currentSwitch = null;
  }

  /**
   * Destroy the manager
   */
  destroy() {
    this.isDestroyed = true;
    this.clearPendingSwitches();
  }
}

// Create singleton switch manager
const switchManager = new SlideSwitchManager();

/* ----------------------------- Helper Functions ---------------------------------- */

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

function ensureSlide(idx) {
  const s = getSlides();
  if (!s.length) {
    setSlides([{ image: null, layers: [], workSize: { w: 800, h: 450 }, durationMs: DEFAULT_DUR }]);
    setActiveIndex(0);
  } else if (idx != null) {
    setActiveIndex(clamp(idx, 0, s.length - 1) | 0);
  }
}

/* --------------------------- Image Loading with Cancellation ----------------------------- */

/**
 * Cancellable image loader
 */
class ImageLoader {
  constructor() {
    this.currentLoad = null;
  }

  /**
   * Load slide image with cancellation support
   */
  async loadSlideImage(slide) {
    // Cancel any previous load
    this.cancelCurrentLoad();
    
    const { userBg, work } = getEls();
    const chosenSrc = slide?.image?.src || slide?.image?.thumb || '';
    
    if (!chosenSrc) {
      imgState.has = false;
      userBg.src = '';
      setTransforms();
      return;
    }

    return new Promise((resolve) => {
      const loadOperation = {
        cancelled: false,
        resolve,
        userBg,
        chosenSrc
      };
      
      this.currentLoad = loadOperation;

      const onLoad = () => {
        if (loadOperation.cancelled) {
          resolve();
          return;
        }

        try {
          imgState.natW = userBg.naturalWidth;
          imgState.natH = userBg.naturalHeight;
          imgState.has = true;
          
          const workRect = work.getBoundingClientRect();
          const centerX = workRect.width / 2;
          const centerY = workRect.height / 2;
          
          // Use saved values or calculate defaults
          if (slide.image && typeof slide.image.scale === 'number') {
            imgState.scale = slide.image.scale;
            imgState.angle = slide.image.angle || 0;
            imgState.signX = slide.image.signX ?? 1;
            imgState.signY = slide.image.signY ?? 1;
            imgState.flip = !!slide.image.flip;
            imgState.cx = slide.image.cx || centerX;
            imgState.cy = slide.image.cy || centerY;
          } else {
            const defaultScale = Math.min(
              workRect.width * 0.95 / imgState.natW,
              workRect.height * 0.95 / imgState.natH
            );
            imgState.scale = defaultScale;
            imgState.angle = 0;
            imgState.signX = 1;
            imgState.signY = 1;
            imgState.flip = false;
            imgState.cx = centerX;
            imgState.cy = centerY;
          }
          
          setTransforms();
        } catch (error) {
          console.warn('Image processing error:', error);
          imgState.has = false;
          setTransforms();
        }
        
        resolve();
      };

      const onError = () => {
        if (!loadOperation.cancelled) {
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

  /**
   * Cancel current image load
   */
  cancelCurrentLoad() {
    if (this.currentLoad) {
      this.currentLoad.cancelled = true;
      this.currentLoad = null;
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.cancelCurrentLoad();
  }
}

// Create singleton image loader
const imageLoader = new ImageLoader();

/* --------------------------- Simplified Slide Loading ----------------------------- */

export async function loadSlideIntoDOM(slide) {
  const { work } = getEls();
  
  try {
    // Set work dimensions
    work.style.setProperty('--work-w', (slide?.workSize?.w || 800) + 'px');
    work.style.setProperty('--work-h', (slide?.workSize?.h || 450) + 'px');

    // Clear existing text layers
    [...work.querySelectorAll('.layer')].forEach(n => n.remove());
    
    // Reset image state
    imgState.has = false;
    
    // Load text layers
    loadLayersIntoDOM(slide?.layers || []);

    // Load image
    await imageLoader.loadSlideImage(slide);
    
  } catch (error) {
    console.error('Error loading slide into DOM:', error);
    // Continue anyway with partial load
  }
}

/* --------------------------- Write Current Slide ----------------------------- */

export function writeCurrentSlide() {
  ensureSlide();
  const slides = getSlides();
  const activeIndex = getActiveIndex();

  if (activeIndex < 0 || activeIndex >= slides.length) return;

  try {
    const layers = buildLayersFromDOM();
    const { userBg } = getEls();
    
    // Build image object
    let image = null;
    if (imgState.has && userBg?.src) {
      image = {
        src: userBg.src,
        thumb: makeThumb(userBg),
        cx: imgState.cx,
        cy: imgState.cy,
        scale: imgState.scale,
        angle: imgState.angle,
        signX: imgState.signX ?? 1,
        signY: imgState.signY ?? 1,
        flip: !!imgState.flip,
        fadeInMs: slides[activeIndex]?.image?.fadeInMs || 0,
        fadeOutMs: slides[activeIndex]?.image?.fadeOutMs || 0,
        zoomInMs: slides[activeIndex]?.image?.zoomInMs || 0,
        zoomOutMs: slides[activeIndex]?.image?.zoomOutMs || 0,
      };
    }

    // Preserve duration + workSize
    const prev = slides[activeIndex] || {};
    slides[activeIndex] = {
      image,
      layers,
      workSize: prev.workSize || { w: 800, h: 450 },
      durationMs: prev.durationMs || DEFAULT_DUR
    };
    
    setSlides([...slides]);
    
    // Only save if not switching (prevent recursive saves)
    if (!switchManager.isSwitching()) {
      saveProjectDebounced();
    }
    
  } catch (error) {
    console.error('Error writing current slide:', error);
  }
}

// Simplified thumbnail generation
function makeThumb(imgEl, maxW = 640, maxH = 640, quality = 0.72) {
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

/* --------------------------- Simplified Navigation Functions ----------------------------- */

export async function setActiveSlide(targetIndex) {
  ensureSlide();
  await switchManager.switchToSlide(targetIndex);
}

export async function previousSlide() {
  const currentIndex = getActiveIndex();
  await setActiveSlide(Math.max(0, currentIndex - 1));
}

export async function nextSlide() {
  const slides = getSlides();
  const currentIndex = getActiveIndex();
  await setActiveSlide(Math.min(slides.length - 1, currentIndex + 1));
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
    
    // Use async click handler
    button.addEventListener('click', async () => {
      try {
        await setActiveSlide(i);
      } catch (error) {
        console.error('Failed to switch to slide:', error);
      }
    });
    
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

/* --------------------------- Slide CRUD Operations ----------------------------- */

export function addSlide() {
  writeCurrentSlide();
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
  setActiveSlide(currentIndex + 1); // Use async slide switching
}

export function duplicateSlide() {
  writeCurrentSlide();
  const slides = getSlides();
  const currentIndex = getActiveIndex();
  const currentSlideData = slides[currentIndex];
  
  if (!currentSlideData) return;
  
  const duplicatedSlide = JSON.parse(JSON.stringify(currentSlideData));
  slides.splice(currentIndex + 1, 0, duplicatedSlide);
  setSlides([...slides]);
  setActiveSlide(currentIndex + 1); // Use async slide switching
}

export function deleteSlide() {
  const slides = getSlides();
  const currentIndex = getActiveIndex();
  
  if (slides.length <= 1) return;
  
  slides.splice(currentIndex, 1);
  setSlides([...slides]);
  
  const newIndex = currentIndex >= slides.length ? slides.length - 1 : currentIndex;
  setActiveSlide(newIndex); // Use async slide switching
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

  // Advance to next slide
  if (elapsed >= duration) {
    const nextIndex = (currentIndex + 1) % slides.length;
    setActiveIndex(nextIndex);
    setSlideStartTs(ts);
    
    // Use simplified slide loading during playback
    try {
      await loadSlideIntoDOM(slides[nextIndex]);
      updateSlidesUI();
    } catch (error) {
      console.error('Error during playback slide switch:', error);
    }
  }

  // Continue animation
  const rafId = requestAnimationFrame(stepFrame);
  setRafId(rafId);
}

export function startPlay() {
  if (getPlaying()) return;
  
  setPlaying(true);
  const { playBtn, userBgWrap } = getEls();
  
  if (playBtn) {
    playBtn.setAttribute('aria-pressed', 'true');
    playBtn.textContent = 'Stop';
  }
  
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

/* --------------------------- Cleanup Functions ----------------------------- */

export function cleanup() {
  console.log('🧹 Cleaning up slide manager...');
  
  stopPlay();
  switchManager.destroy();
  imageLoader.destroy();
  
  console.log('✅ Slide manager cleaned up');
}

/* --------------------------- Initialization ----------------------------- */

// Ensure UI is updated when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateSlidesUI);
} else {
  updateSlidesUI();
}