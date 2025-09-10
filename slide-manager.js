// slide-manager.js - COMPLETE FIXED VERSION WITH IMAGE PERSISTENCE

import { getSlides, getActiveIndex, setActiveIndex, setSlides, recordHistory, saveProjectDebounced } from './state-manager.js';
import { imgState, setTransforms, enforceImageBounds, toggleUploadBtn, getFxScale } from './image-manager.js';
import { clamp } from './utils.js';

// Constants
const DEFAULT_DUR = 3000;
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 1.2;

// Get slide image helper function
function getSlideImage() {
  const slides = getSlides();
  const activeIndex = getActiveIndex();
  const slide = slides[activeIndex];
  return slide?.image || null;
}

// Animation state for proper fade/zoom during playback
let animationState = {
  rafId: null,
  slideStartTime: 0,
  isAnimating: false
};

// Slide switching state management
class SlideSwitchManager {
  constructor() {
    this.currentSwitch = null;
    this.isDestroyed = false;
  }

  isSwitching() {
    return !this.isDestroyed && !!this.currentSwitch;
  }

  beginSwitch() {
    if (this.isSwitching()) {
      return false;
    }
    
    this.currentSwitch = {
      startTime: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    return this.currentSwitch;
  }

  endSwitch(switchId) {
    if (this.currentSwitch && this.currentSwitch.id === switchId) {
      this.currentSwitch = null;
      return true;
    }
    return false;
  }

  isCurrentSwitch(switchOperation) {
    return this.currentSwitch && 
           this.currentSwitch.id === switchOperation?.id && 
           !this.isDestroyed;
  }

  clearPendingSwitches() {
    this.currentSwitch = null;
  }

  destroy() {
    this.isDestroyed = true;
    this.clearPendingSwitches();
  }
}

// Create singleton switch manager
const switchManager = new SlideSwitchManager();

// Store original transforms for animations
function storeOriginalLayerTransforms() {
  const layers = document.querySelectorAll('.layer');
  layers.forEach(layer => {
    layer.setAttribute('data-original-transform', layer.style.transform || '');
  });
}

/* ----------------------------- Animation Functions ---------------------------------- */

function easeInOut(t) {
  return -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;
}

function easeZoom(progress, start, end) {
  const eased = easeInOut(clamp(progress, 0, 1));
  return start + (end - start) * eased;
}

function computeOpacity(elapsed, duration, fadeInMs, fadeOutMs) {
  const fadeIn = fadeInMs || 0;
  const fadeOut = fadeOutMs || 0;

  let opacity = 1;

  if (fadeIn > 0 && elapsed < fadeIn) {
    const progress = elapsed / fadeIn;
    opacity = clamp(easeInOut(progress), 0, 1);
  }

  if (fadeOut > 0 && elapsed > (duration - fadeOut)) {
    const fadeOutProgress = (elapsed - (duration - fadeOut)) / fadeOut;
    opacity = clamp(1 - easeInOut(fadeOutProgress), 0, 1);
  }

  return clamp(opacity, 0, 1);
}

function computeZoomScale(elapsed, duration, zoomInMs, zoomOutMs) {
  const zoomIn = zoomInMs || 0;
  const zoomOut = zoomOutMs || 0;

  let scale = 1;

  if (zoomIn > 0 && elapsed < zoomIn) {
    const progress = elapsed / zoomIn;
    scale = easeZoom(progress, ZOOM_MIN, 1);
  }

  if (zoomOut > 0 && elapsed > (duration - zoomOut)) {
    const progress = (elapsed - (duration - zoomOut)) / zoomOut;
    scale = easeZoom(progress, 1, ZOOM_MAX);
  }

  return clamp(scale, ZOOM_MIN, ZOOM_MAX);
}

function stepFrame(timestamp) {
  if (!slidePlayback.isPlaying) {
    animationState.isAnimating = false;
    animationState.rafId = null;
    return;
  }
  
  const slides = getSlides();
  const currentIndex = slidePlayback.currentSlideIndex;
  const currentSlide = slides[currentIndex];
  
  if (!currentSlide) {
    stopSlides();
    return;
  }
  
  const elapsed = timestamp - animationState.slideStartTime;
  const duration = currentSlide.durationMs || DEFAULT_DUR;
  
  // Apply animations to text layers
  const workElement = document.getElementById('work');
  if (workElement) {
    const layers = workElement.querySelectorAll('.layer');
    layers.forEach((layer, index) => {
      const layerData = currentSlide.layers?.[index] || {};
      
      const opacity = computeOpacity(
        elapsed, 
        duration, 
        layerData.fadeInMs || 0, 
        layerData.fadeOutMs || 0
      );
      layer.style.opacity = opacity.toString();
      
      const scale = computeZoomScale(
        elapsed,
        duration,
        layerData.zoomInMs || 0,
        layerData.zoomOutMs || 0
      );

      const originalTransform = layer.getAttribute('data-original-transform') || '';

      if (scale !== 1) {
        layer.style.transform = `${originalTransform} scale(${scale})`.trim();
        layer.style.transformOrigin = 'center center';
      } else {
        layer.style.transform = originalTransform;
      }
    });
  }
  
  // Apply animations to background image
  const userBgWrap = document.getElementById('userBgWrap');
  const userBg = document.getElementById('userBg');
  if (currentSlide.image && userBgWrap && userBg) {
    const imageData = currentSlide.image;
    
    const opacity = computeOpacity(
      elapsed,
      duration,
      imageData.fadeInMs || 0,
      imageData.fadeOutMs || 0
    );
    userBgWrap.style.opacity = opacity.toString();
    
    const scale = computeZoomScale(
      elapsed,
      duration,
      imageData.zoomInMs || 0,
      imageData.zoomOutMs || 0
    );

    const currentTransform = userBg.style.transform || '';
    const base = currentTransform.replace(/scale\([^)]*\)/g, '').trim();

    if (scale !== 1) {
      userBg.style.transform = `${base} scale(${scale})`.trim();
    } else {
      userBg.style.transform = base;
    }
  }
  
  animationState.rafId = requestAnimationFrame(stepFrame);
}

function startAnimationLoop() {
  if (animationState.isAnimating) {
    return;
  }

  storeOriginalLayerTransforms();

  animationState.isAnimating = true;
  animationState.slideStartTime = performance.now();
  animationState.rafId = requestAnimationFrame(stepFrame);
  
  console.log('Animation loop started');
}

function stopAnimationLoop() {
  animationState.isAnimating = false;
  
  if (animationState.rafId) {
    cancelAnimationFrame(animationState.rafId);
    animationState.rafId = null;
  }
  
  resetAnimations();
  
  console.log('Animation loop stopped');
}

function resetAnimations() {
  const layers = document.querySelectorAll('.layer');
  layers.forEach(layer => {
    layer.style.opacity = '1';
    const originalTransform = layer.getAttribute('data-original-transform') || '';
    layer.style.transform = originalTransform;
  });
  
  const userBgWrap = document.getElementById('userBgWrap');
  const userBg = document.getElementById('userBg');
  
  if (userBgWrap) {
    userBgWrap.style.opacity = '1';
  }
  
  if (userBg) {
    const currentTransform = userBg.style.transform || '';
    userBg.style.transform = currentTransform.replace(/scale\([^)]*\)/g, '').trim();
  }
}

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

/* ----------------------------- Image Loading with Persistence ----------------------------- */

class ImageLoader {
  constructor() {
    this.currentLoad = null;
  }

  async loadSlideImage(slide) {
    this.cancelCurrentLoad();
    
    const { userBg, work } = getEls();
    
    if (!slide?.image?.src) {
      imgState.has = false;
      imgState.shearX = 0;
      imgState.shearY = 0;
      if (userBg) userBg.src = '';
      setTransforms();
      return;
    }

    const imageData = slide.image;
    const chosenSrc = imageData.src || imageData.thumb || '';

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
          // Restore image state from saved data
          imgState.natW = imageData.natW || userBg.naturalWidth;
          imgState.natH = imageData.natH || userBg.naturalHeight;
          imgState.has = true;
          
          // Restore transform values or use defaults
          if (typeof imageData.scale === 'number') {
            imgState.scale = imageData.scale;
            imgState.angle = imageData.angle || 0;
            imgState.cx = imageData.cx || (work.getBoundingClientRect().width / 2);
            imgState.cy = imageData.cy || (work.getBoundingClientRect().height / 2);
            imgState.shearX = imageData.shearX || 0;
            imgState.shearY = imageData.shearY || 0;
            imgState.signX = imageData.signX || 1;
            imgState.signY = imageData.signY || 1;
            imgState.flip = imageData.flip || false;
          } else {
            // Calculate cover scale defaults if no saved values
            const workRect = work.getBoundingClientRect();
            const coverScale = Math.max(
              workRect.width / imgState.natW,
              workRect.height / imgState.natH
            );
            imgState.scale = Math.min(getFxScale(), coverScale);
            imgState.angle = 0;
            imgState.cx = workRect.width / 2;
            imgState.cy = workRect.height / 2;
            imgState.shearX = 0;
            imgState.shearY = 0;
            imgState.signX = 1;
            imgState.signY = 1;
            imgState.flip = false;
          }
          
          // Restore backend info if available
          if (imageData.backendImageId) {
            imgState.backendImageId = imageData.backendImageId;
            imgState.backendImageUrl = imageData.backendImageUrl;
            imgState.backendThumbnailUrl = imageData.backendThumbnailUrl;
          }
          
          setTransforms();
          if (!document.body.classList.contains('viewer')) {
            enforceImageBounds();
          }
          toggleUploadBtn();
          
          console.log('Image loaded and state restored from slide data');

        } catch (error) {
          console.error('Error restoring image state:', error);
          imgState.has = false;
          setTransforms();
        }

        resolve();
      };

      const onError = () => {
        if (loadOperation.cancelled) {
          resolve();
          return;
        }
        
        console.error('Failed to load image:', chosenSrc);
        
        // If backend image fails, try to fallback to thumbnail
        if (imageData.isLocal === false && imageData.backendThumbnailUrl && 
            imageData.backendThumbnailUrl !== chosenSrc) {
          console.log('Trying backup thumbnail URL');
          userBg.src = imageData.backendThumbnailUrl;
          return;
        }
        
        imgState.has = false;
        setTransforms();
        resolve();
      };

      userBg.onload = onLoad;
      userBg.onerror = onError;
      userBg.src = chosenSrc;
    });
  }

  cancelCurrentLoad() {
    if (this.currentLoad) {
      this.currentLoad.cancelled = true;
      this.currentLoad = null;
    }
  }

  destroy() {
    this.cancelCurrentLoad();
  }
}

// Create singleton image loader
const imageLoader = new ImageLoader();

/* ----------------------------- Slide Loading ----------------------------- */

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

    // Record original transforms for all layers after creation
    storeOriginalLayerTransforms();

    console.log('Slide loaded into DOM');

  } catch (error) {
    console.error('Failed to load slide into DOM:', error);
  }
}

/* ----------------------------- Text Layer Creation ----------------------------- */

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

    // Store timing data on the element for smooth animations
    if (textEl) {
      textEl._fadeInMs = layerData.fadeInMs || 0;
      textEl._fadeOutMs = layerData.fadeOutMs || 0;
      textEl._zoomInMs = layerData.zoomInMs || 0;
      textEl._zoomOutMs = layerData.zoomOutMs || 0;
      
      // Optimize element for smooth animations
      textEl.style.backfaceVisibility = 'hidden';
      textEl.style.perspective = '1000px';
    }

    return textEl;
  } catch (error) {
    console.error('Failed to create text layer:', error);
    return null;
  }
}

/* ----------------------------- Slide Switching ----------------------------- */

export async function switchToSlide(idx) {
  const switchOperation = switchManager.beginSwitch();
  if (!switchOperation) {
    console.log('Switch already in progress, ignoring request');
    return;
  }

  try {
    ensureSlide(idx);
    const targetIndex = getActiveIndex();
    
    console.log(`Switching to slide ${targetIndex}`);

    const slides = getSlides();
    await loadSlideIntoDOM(slides[targetIndex]);
    
    updateSlidesUI();
    
    if (!switchManager.isCurrentSwitch(switchOperation)) {
      console.log('Switch operation superseded, aborting');
      return;
    }

    console.log(`Successfully switched to slide ${targetIndex}`);
    
  } catch (error) {
    console.error('Failed to switch slide:', error);
  } finally {
    switchManager.endSwitch(switchOperation.id);
  }
}

async function directSwitchToSlide(idx) {
  try {
    ensureSlide(idx);
    const targetIndex = getActiveIndex();
    
    console.log(`Direct switching to slide ${targetIndex} (playback)`);

    const slides = getSlides();
    await loadSlideIntoDOM(slides[targetIndex]);
    
    updateSlidesUI();

    if (slidePlayback.isPlaying) {
      animationState.slideStartTime = performance.now();
    }

    console.log(`Direct switch to slide ${targetIndex} complete`);
    
  } catch (error) {
    console.error('Failed to direct switch slide:', error);
    throw error;
  }
}

/* ----------------------------- UI Updates ----------------------------- */

export function updateSlidesUI() {
  const { slidesStrip, slideLabel, slideDur, slideDurVal } = getEls();
  const slides = getSlides();
  const activeIndex = getActiveIndex();

  if (slidesStrip) {
    slidesStrip.innerHTML = slides.map((slide, i) => 
      `<button class="slide-chip ${i === activeIndex ? 'active' : ''}" 
              data-slide="${i}"
              aria-pressed="${i === activeIndex}"
              title="Slide ${i + 1}">
        ${i + 1}
      </button>`
    ).join('');

    [...slidesStrip.querySelectorAll('.slide-chip')].forEach(chip => {
      chip.addEventListener('click', () => {
        const slideIndex = parseInt(chip.dataset.slide, 10);
        switchToSlide(slideIndex);
      });
    });
  }

  if (slideLabel) {
    slideLabel.textContent = `Slide ${activeIndex + 1} of ${slides.length}`;
  }

  const currentSlideData = slides[activeIndex];
  if (slideDur && slideDurVal && currentSlideData) {
    const durationMs = currentSlideData.durationMs || DEFAULT_DUR;
    slideDur.value = durationMs;
    slideDurVal.textContent = (durationMs / 1000).toFixed(1) + 's';
  }
}

/* ----------------------------- Slide Data Management ----------------------------- */

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
      lineHeight: el.style.lineHeight || 'normal',
      // Include timing data
      fadeInMs: el._fadeInMs || 0,
      fadeOutMs: el._fadeOutMs || 0,
      zoomInMs: el._zoomInMs || 0,
      zoomOutMs: el._zoomOutMs || 0
    }));

    slide.layers = layers;

    slides[activeIndex] = slide;
    setSlides([...slides]);

    console.log('Current slide data written');
    
  } catch (error) {
    console.error('Failed to write current slide:', error);
  }
}

/* ----------------------------- Slide Actions ----------------------------- */

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
    
    console.log('New slide added');
    recordHistory();
  } catch (error) {
    console.error('Failed to add slide:', error);
  }
}

export function duplicateSlide() {
  try {
    writeCurrentSlide();
    
    const slides = getSlides();
    const currentIndex = getActiveIndex();
    const currentSlide = slides[currentIndex];
    
    if (!currentSlide) {
      console.warn('No slide to duplicate');
      return;
    }
    
    const duplicatedSlide = JSON.parse(JSON.stringify(currentSlide));
    
    const newSlides = [...slides];
    newSlides.splice(currentIndex + 1, 0, duplicatedSlide);
    
    setSlides(newSlides);
    switchToSlide(currentIndex + 1);
    
    console.log('Slide duplicated');
    recordHistory();
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
    
    const newActiveIndex = Math.min(currentIndex, newSlides.length - 1);
    switchToSlide(newActiveIndex);
    
    console.log('Slide deleted');
    recordHistory();
  } catch (error) {
    console.error('Failed to delete slide:', error);
  }
}

/* ----------------------------- Slide Duration ----------------------------- */

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
      
      setSlides([...slides]);
      
      console.log(`Slide duration set to ${durationMs}ms`);
      recordHistory();
    }
  } catch (error) {
    console.error('Failed to update slide duration:', error);
  }
}

export function handleSlideDurationChange(value) {
  handleSlideDuration(value);
}

/* ----------------------------- Slide Playback ----------------------------- */

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
  
  const playBtn = document.getElementById('playSlidesBtn');
  if (playBtn) {
    playBtn.textContent = 'Stop';
    playBtn.classList.add('active');
    playBtn.setAttribute('aria-pressed', 'true');
  }
  
  startAnimationLoop();
  
  playNextSlide();
  console.log('Started slide playback with animations');
}

export function stopSlides() {
  slidePlayback.isPlaying = false;
  
  if (slidePlayback.timeoutId) {
    clearTimeout(slidePlayback.timeoutId);
    slidePlayback.timeoutId = null;
  }
  
  stopAnimationLoop();
  
  const playBtn = document.getElementById('playSlidesBtn');
  if (playBtn) {
    playBtn.textContent = 'Play';
    playBtn.classList.remove('active');
    playBtn.setAttribute('aria-pressed', 'false');
  }
  
  console.log('Stopped slide playback');
}

async function playNextSlide() {
  if (!slidePlayback.isPlaying) return;
  
  const slides = getSlides();
  if (slidePlayback.currentSlideIndex >= slides.length) {
    slidePlayback.currentSlideIndex = 0;
  }
  
  const slide = slides[slidePlayback.currentSlideIndex];
  
  try {
    console.log(`Playing slide ${slidePlayback.currentSlideIndex + 1} of ${slides.length}`);
    
    await directSwitchToSlide(slidePlayback.currentSlideIndex);
    
    if (!slidePlayback.isPlaying) {
      console.log('Playback stopped during slide switch');
      return;
    }
    
    const duration = slide?.durationMs || DEFAULT_DUR;
    console.log(`Setting timer for ${duration}ms`);
    
    slidePlayback.timeoutId = setTimeout(async () => {
      if (slidePlayback.isPlaying) {
        slidePlayback.currentSlideIndex++;
        await playNextSlide();
      }
    }, duration);
    
  } catch (error) {
    console.error('Error during slide playback:', error);
    stopSlides();
  }
}

/* ----------------------------- Slide Navigation ----------------------------- */

export async function previousSlide() {
  const slides = getSlides();
  const activeIndex = getActiveIndex();
  const newIndex = activeIndex > 0 ? activeIndex - 1 : slides.length - 1;
  await switchToSlide(newIndex);
}

export async function nextSlide() {
  const slides = getSlides();
  const activeIndex = getActiveIndex();
  const newIndex = activeIndex < slides.length - 1 ? activeIndex + 1 : 0;
  await switchToSlide(newIndex);
}

/* ----------------------------- Debug Functions ----------------------------- */

export function getPlaybackState() {
  return {
    isPlaying: slidePlayback.isPlaying,
    currentSlideIndex: slidePlayback.currentSlideIndex,
    hasTimeout: !!slidePlayback.timeoutId,
    totalSlides: getSlides().length,
    switchManagerBusy: switchManager.isSwitching(),
    timeoutId: slidePlayback.timeoutId,
    isAnimating: animationState.isAnimating,
    animationRafId: animationState.rafId
  };
}

export function forceStopPlayback() {
  console.log('Force stopping playback');
  slidePlayback.isPlaying = false;
  
  if (slidePlayback.timeoutId) {
    clearTimeout(slidePlayback.timeoutId);
    slidePlayback.timeoutId = null;
  }
  
  stopAnimationLoop();
  
  switchManager.clearPendingSwitches();
  
  const playBtn = document.getElementById('playSlidesBtn');
  if (playBtn) {
    playBtn.textContent = 'Play';
    playBtn.classList.remove('active');
  }
  
  console.log('Playback force stopped');
}

export function testPlayback() {
  console.log('Testing playback system...');
  console.log('Current state:', getPlaybackState());
  
  const slides = getSlides();
  console.log(`Total slides: ${slides.length}`);
  
  if (slides.length > 1) {
    console.log('Starting test playback...');
    playSlides();
  } else {
    console.log('Need at least 2 slides for testing');
  }
}

export function advanceSlide() {
  if (slidePlayback.isPlaying) {
    slidePlayback.currentSlideIndex++;
    playNextSlide();
  }
}

/* ----------------------------- Reset Utilities ----------------------------- */

export function resetOpacities() {
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

/* ----------------------------- Image Persistence Validation ----------------------------- */

export function validateImagePersistence() {
  try {
    const slides = getSlides();
    const activeIndex = getActiveIndex();
    const currentSlide = slides[activeIndex];
    
    console.log('=== IMAGE PERSISTENCE CHECK ===');
    console.log('Current slide has image:', !!currentSlide?.image);
    console.log('Image src:', currentSlide?.image?.src?.substring(0, 50) + '...');
    console.log('Image data:', currentSlide?.image);
    console.log('ImgState has:', imgState.has);
    console.log('================================');
  } catch (error) {
    console.error('Failed to validate image persistence:', error);
  }
}

/* ----------------------------- Cleanup ----------------------------- */

export function destroySlideManager() {
  stopAnimationLoop();
  switchManager.destroy();
  imageLoader.destroy();
  stopSlides();
  console.log('Slide manager destroyed');
}

// Initialize slides UI when the module loads
document.addEventListener('DOMContentLoaded', () => {
  updateSlidesUI();
});

// Export for debugging
window.validateImagePersistence = validateImagePersistence;