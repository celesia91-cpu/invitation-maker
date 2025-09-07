// slide-manager.js - COMPLETE FIXED VERSION - No missing imports

import { getSlides, getActiveIndex, setActiveIndex, setSlides } from './state-manager.js';
import { imgState, setTransforms } from './image-manager.js';
import { clamp } from './utils.js';

// Constants
const DEFAULT_DUR = 3000;

// FIXED: Get slide image helper function (no import needed)
function getSlideImage() {
  const slides = getSlides();
  const activeIndex = getActiveIndex();
  const slide = slides[activeIndex];
  return slide?.image || null;
}

// Slide switching state management
class SlideSwitchManager {
  constructor() {
    this.currentSwitch = null;
    this.isDestroyed = false;
  }

  /**
   * Check if a switch operation is in progress
   */
  isSwitching() {
    return !this.isDestroyed && !!this.currentSwitch;
  }

  /**
   * Start a new switch operation if none is in progress
   */
  beginSwitch() {
    if (this.isSwitching()) {
      return false; // Switch already in progress
    }
    
    this.currentSwitch = {
      startTime: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    return this.currentSwitch;
  }

  /**
   * End the current switch operation
   */
  endSwitch(switchId) {
    if (this.currentSwitch && this.currentSwitch.id === switchId) {
      this.currentSwitch = null;
      return true;
    }
    return false;
  }

  /**
   * Check if the provided switch is the current one
   */
  isCurrentSwitch(switchOperation) {
    return this.currentSwitch && 
           this.currentSwitch.id === switchOperation?.id && 
           !this.isDestroyed;
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
   * Load slide image defaulting to fit within the work area
   */
  async loadSlideImage(slide) {
    // Cancel any previous load
    this.cancelCurrentLoad();
    
    const { userBg, work } = getEls();
    const chosenSrc = slide?.image?.src || slide?.image?.thumb || '';
    
    if (!chosenSrc) {
      imgState.has = false;
      imgState.shearX = 0;
      imgState.shearY = 0;
      if (userBg) userBg.src = '';
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
          
          // Use saved values or calculate fit-to-canvas defaults
          if (slide.image && typeof slide.image.scale === 'number') {
            imgState.scale = slide.image.scale;
            imgState.angle = slide.image.angle || 0;
            imgState.shearX = slide.image.shearX ?? 0;
            imgState.shearY = slide.image.shearY ?? 0;
            imgState.signX = slide.image.signX ?? 1;
            imgState.signY = slide.image.signY ?? 1;
            imgState.flip = !!slide.image.flip;
            imgState.cx = slide.image.cx || centerX;
            imgState.cy = slide.image.cy || centerY;
          } else {
            // Default to scale that keeps entire image visible
            const scaleToFitWidth = workRect.width / imgState.natW;
            const scaleToFitHeight = workRect.height / imgState.natH;

            // Use the smaller scale and avoid upscaling beyond 100%
            imgState.scale = Math.min(1, scaleToFitWidth, scaleToFitHeight);
            imgState.angle = 0;
            imgState.shearX = 0;
            imgState.shearY = 0;
            imgState.signX = 1;
            imgState.signY = 1;
            imgState.flip = false;
            imgState.cx = centerX;
            imgState.cy = centerY;
          }
          
          setTransforms();
          console.log('✅ Slide image loaded with fit-to-canvas scale:', imgState.scale);
          
        } catch (error) {
          console.warn('Image processing error:', error);
          imgState.has = false;
          imgState.shearX = 0;
          imgState.shearY = 0;
          setTransforms();
        }
        
        resolve();
      };

      const onError = () => {
        if (!loadOperation.cancelled) {
          imgState.has = false;
          imgState.shearX = 0;
          imgState.shearY = 0;
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
    if (work) {
      work.style.setProperty('--work-w', (slide?.workSize?.w || 800) + 'px');
      work.style.setProperty('--work-h', (slide?.workSize?.h || 450) + 'px');
    }

    // Clear existing text layers
    if (work) {
      [...work.querySelectorAll('.layer')].forEach(n => n.remove());
    }
    
    // Reset image state
    imgState.has = false;
    imgState.shearX = 0;
    imgState.shearY = 0;

    // Ensure zoom timing defaults exist
    if (slide?.image) {
      slide.image.zoomInMs = slide.image.zoomInMs ?? 0;
      slide.image.zoomOutMs = slide.image.zoomOutMs ?? 0;
      slide.image.fadeInMs = slide.image.fadeInMs ?? 0;
      slide.image.fadeOutMs = slide.image.fadeOutMs ?? 0;
    }

    // Load image if present
    if (slide?.image?.src || slide?.image?.thumb) {
      await imageLoader.loadSlideImage(slide);
    } else {
      setTransforms();
    }

    // Create text layers
    if (slide?.layers) {
      for (const layer of slide.layers) {
        await createTextLayerFromData(layer);
      }
    }

    console.log('✅ Slide loaded into DOM');

  } catch (error) {
    console.error('Failed to load slide into DOM:', error);
  }
}

/* --------------------------- Text Layer Creation ----------------------------- */

async function createTextLayerFromData(layerData) {
  try {
    const { addTextLayer } = await import('./text-manager.js');
    
    const textEl = await addTextLayer(layerData.text || 'Text', {
      fontSize: layerData.fontSize || 28,
      fontFamily: layerData.fontFamily || 'system-ui',
      fontWeight: layerData.fontWeight || 'normal',
      fontStyle: layerData.fontStyle || 'normal',
      color: layerData.color || '#ffffff',
      left: layerData.left || 0,
      top: layerData.top || 0,
      width: layerData.width,
      textAlign: layerData.textAlign || 'left',
      textDecoration: layerData.textDecoration || 'none',
      textShadow: layerData.textShadow || 'none',
      letterSpacing: layerData.letterSpacing || 'normal',
      lineHeight: layerData.lineHeight || 'normal'
    });

    return textEl;
  } catch (error) {
    console.error('Failed to create text layer:', error);
    return null;
  }
}

/* --------------------------- Slide Switching ----------------------------- */

export async function switchToSlide(idx) {
  // Start a new switch operation
  const switchOperation = switchManager.beginSwitch();
  if (!switchOperation) {
    console.log('Switch already in progress, ignoring request');
    return;
  }

  try {
    ensureSlide(idx);
    const targetIndex = getActiveIndex();
    
    console.log(`🔄 Switching to slide ${targetIndex}`);

    // Load the slide
    const slides = getSlides();
    await loadSlideIntoDOM(slides[targetIndex]);
    
    // Update UI
    updateSlidesUI();
    
    // Verify this switch operation is still current
    if (!switchManager.isCurrentSwitch(switchOperation)) {
      console.log('Switch operation superseded, aborting');
      return;
    }

    console.log(`✅ Successfully switched to slide ${targetIndex}`);
    
  } catch (error) {
    console.error('Failed to switch slide:', error);
  } finally {
    // End the switch operation
    switchManager.endSwitch(switchOperation.id);
  }
}

/* --------------------------- UI Updates ----------------------------- */

export function updateSlidesUI() {
  const { slidesStrip, slideLabel, slideDur, slideDurVal } = getEls();
  const slides = getSlides();
  const activeIndex = getActiveIndex();

  // Update slides strip
  if (slidesStrip) {
    slidesStrip.innerHTML = slides.map((slide, i) => 
      `<button class="slide-chip ${i === activeIndex ? 'active' : ''}" 
              data-slide="${i}"
              aria-pressed="${i === activeIndex}"
              title="Slide ${i + 1}">
        ${i + 1}
      </button>`
    ).join('');

    // Add click handlers
    [...slidesStrip.querySelectorAll('.slide-chip')].forEach(chip => {
      chip.addEventListener('click', () => {
        const slideIndex = parseInt(chip.dataset.slide, 10);
        switchToSlide(slideIndex);
      });
    });
  }

  // Update slide label
  if (slideLabel) {
    slideLabel.textContent = `Slide ${activeIndex + 1} of ${slides.length}`;
  }

  // Update duration controls
  const currentSlideData = slides[activeIndex];
  if (slideDur && slideDurVal && currentSlideData) {
    const durationMs = currentSlideData.durationMs || DEFAULT_DUR;
    slideDur.value = durationMs;
    slideDurVal.textContent = (durationMs / 1000).toFixed(1) + 's';
  }
}

/* --------------------------- Slide Data Management ----------------------------- */

export function writeCurrentSlide() {
  try {
    const slides = getSlides();
    const activeIndex = getActiveIndex();
    const slide = slides[activeIndex];
    
    if (!slide) {
      console.warn('No active slide to write to');
      return;
    }

    // Update image data
    if (imgState.has) {
      slide.image = {
        src: document.querySelector('#userBg')?.src || '',
        scale: imgState.scale,
        angle: imgState.angle,
        shearX: imgState.shearX,
        shearY: imgState.shearY,
        signX: imgState.signX,
        signY: imgState.signY,
        flip: imgState.flip,
        cx: imgState.cx,
        cy: imgState.cy,
        natW: imgState.natW,
        natH: imgState.natH,
        // Preserve timing data
        zoomInMs: slide.image?.zoomInMs ?? 0,
        zoomOutMs: slide.image?.zoomOutMs ?? 0,
        fadeInMs: slide.image?.fadeInMs ?? 0,
        fadeOutMs: slide.image?.fadeOutMs ?? 0,
        // Backend data if available
        ...(imgState.backendImageId && {
          backendImageId: imgState.backendImageId,
          backendImageUrl: imgState.backendImageUrl,
          backendThumbnailUrl: imgState.backendThumbnailUrl
        })
      };
    } else {
      slide.image = null;
    }

    // Update text layers
    const layers = [...document.querySelectorAll('.layer')].map(el => ({
      text: el.textContent || '',
      left: parseFloat(el.style.left || '0'),
      top: parseFloat(el.style.top || '0'),
      width: el.style.width ? parseFloat(el.style.width) : null,
      fontSize: parseFloat(el.style.fontSize || '28'),
      fontFamily: el.style.fontFamily || 'system-ui',
      fontWeight: el.style.fontWeight || 'normal',
      fontStyle: el.style.fontStyle || 'normal',
      color: el.style.color || '#ffffff',
      textAlign: el.style.textAlign || 'left',
      textDecoration: el.style.textDecoration || 'none',
      textShadow: el.style.textShadow || 'none',
      letterSpacing: el.style.letterSpacing || 'normal',
      lineHeight: el.style.lineHeight || 'normal'
    }));

    slide.layers = layers;

    // Update slides array
    slides[activeIndex] = slide;
    setSlides([...slides]); // Create new array to trigger updates

    console.log('✅ Current slide data written');
    
  } catch (error) {
    console.error('Failed to write current slide:', error);
  }
}

/* --------------------------- Slide Actions ----------------------------- */

export function addSlide() {
  try {
    const slides = getSlides();
    const currentIndex = getActiveIndex();
    const workSize = { w: 800, h: 450 };
    
    const newSlide = {
      image: null,
      layers: [],
      workSize,
      durationMs: DEFAULT_DUR
    };
    
    const newSlides = [...slides];
    newSlides.splice(currentIndex + 1, 0, newSlide);
    
    setSlides(newSlides);
    switchToSlide(currentIndex + 1);
    
    console.log('✅ New slide added');
  } catch (error) {
    console.error('Failed to add slide:', error);
  }
}

export function duplicateSlide() {
  try {
    writeCurrentSlide(); // Save current state first
    
    const slides = getSlides();
    const currentIndex = getActiveIndex();
    const currentSlide = slides[currentIndex];
    
    if (!currentSlide) {
      console.warn('No slide to duplicate');
      return;
    }
    
    // Deep clone the slide
    const duplicatedSlide = JSON.parse(JSON.stringify(currentSlide));
    
    const newSlides = [...slides];
    newSlides.splice(currentIndex + 1, 0, duplicatedSlide);
    
    setSlides(newSlides);
    switchToSlide(currentIndex + 1);
    
    console.log('✅ Slide duplicated');
  } catch (error) {
    console.error('Failed to duplicate slide:', error);
  }
}

export function deleteSlide() {
  try {
    const slides = getSlides();
    const currentIndex = getActiveIndex();
    
    if (slides.length <= 1) {
      console.warn('Cannot delete the last slide');
      return;
    }
    
    const newSlides = slides.filter((_, i) => i !== currentIndex);
    setSlides(newSlides);
    
    // Adjust active index if necessary
    const newActiveIndex = Math.min(currentIndex, newSlides.length - 1);
    switchToSlide(newActiveIndex);
    
    console.log('✅ Slide deleted');
  } catch (error) {
    console.error('Failed to delete slide:', error);
  }
}

/* --------------------------- Slide Duration ----------------------------- */

export function handleSlideDuration(value) {
  try {
    const slides = getSlides();
    const activeIndex = getActiveIndex();
    const slide = slides[activeIndex];
    
    if (slide) {
      const durationMs = parseInt(value, 10) || DEFAULT_DUR;
      slide.durationMs = durationMs;
      
      const slideDurVal = document.getElementById('slideDurVal');
      if (slideDurVal) {
        slideDurVal.textContent = (durationMs / 1000).toFixed(1) + 's';
      }
      
      setSlides([...slides]); // Trigger update
      
      console.log(`✅ Slide duration set to ${durationMs}ms`);
    }
  } catch (error) {
    console.error('Failed to update slide duration:', error);
  }
}

/* --------------------------- Slide Playback ----------------------------- */

let slidePlayback = {
  isPlaying: false,
  currentSlideIndex: 0,
  timeoutId: null,
  startTime: 0
};

export function startPlay() {
  if (!slidePlayback.isPlaying) {
    playSlides();
  }
}

export function playSlides() {
  if (slidePlayback.isPlaying) {
    stopSlides();
    return;
  }
  
  const slides = getSlides();
  if (slides.length === 0) return;
  
  slidePlayback.isPlaying = true;
  slidePlayback.currentSlideIndex = getActiveIndex();
  slidePlayback.startTime = Date.now();
  
  // Update play button
  const playBtn = document.getElementById('playSlidesBtn');
  if (playBtn) {
    playBtn.textContent = 'Stop';
    playBtn.classList.add('active');
  }
  
  // FIXED: Call async version
  playNextSlide();
  console.log('▶️ Started slide playback');
}

export function stopSlides() {
  slidePlayback.isPlaying = false;
  
  if (slidePlayback.timeoutId) {
    clearTimeout(slidePlayback.timeoutId);
    slidePlayback.timeoutId = null;
  }
  
  // Update play button
  const playBtn = document.getElementById('playSlidesBtn');
  if (playBtn) {
    playBtn.textContent = 'Play';
    playBtn.classList.remove('active');
  }
  
  console.log('⏹️ Stopped slide playback');
}

async function playNextSlide() {
  if (!slidePlayback.isPlaying) return;
  
  const slides = getSlides();
  if (slidePlayback.currentSlideIndex >= slides.length) {
    // Loop back to start or stop
    slidePlayback.currentSlideIndex = 0;
  }
  
  const slide = slides[slidePlayback.currentSlideIndex];
  
  try {
    // CRITICAL FIX: Await the slide switch to complete before starting timer
    await switchToSlide(slidePlayback.currentSlideIndex);
    
    // Only set timeout after slide has fully loaded
    if (slidePlayback.isPlaying) { // Check if still playing after await
      const duration = slide?.durationMs || DEFAULT_DUR;
      slidePlayback.timeoutId = setTimeout(() => {
        slidePlayback.currentSlideIndex++;
        playNextSlide(); // This will be async now
      }, duration);
    }
  } catch (error) {
    console.error('Error during slide playback:', error);
    // Stop playback on error to prevent getting stuck
    stopSlides();
  }
}

/* --------------------------- Reset Utilities ----------------------------- */

export function resetOpacities() {
  // Reset any opacity animations or transitions
  const userBg = document.querySelector('#userBg');
  if (userBg) {
    userBg.style.opacity = '';
    userBg.style.transition = '';
  }
  
  const layers = document.querySelectorAll('.layer');
  layers.forEach(layer => {
    layer.style.opacity = '';
    layer.style.transition = '';
  });
}

/* --------------------------- Cleanup ----------------------------- */

export function destroySlideManager() {
  switchManager.destroy();
  imageLoader.destroy();
  stopSlides();
  console.log('✅ Slide manager destroyed');
}

/* --------------------------- Initialization ----------------------------- */

// Initialize slides UI when the module loads
document.addEventListener('DOMContentLoaded', () => {
  updateSlidesUI();
});