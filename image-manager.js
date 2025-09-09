// image-manager.js - COMPLETE ENHANCED VERSION WITH PERCENTAGE-BASED POSITIONING

import { apiClient } from './api-client.js';
import { clamp } from './utils.js';
import { getSlides, getActiveIndex, setSlides, saveProjectDebounced, recordHistory } from './state-manager.js';

// Image state management
export const imgState = {
  has: false,
  natW: 0,
  natH: 0,
  cx: 0,
  cy: 0,
  scale: 1,
  angle: 0,
  shearX: 0,
  shearY: 0,
  signX: 1,
  signY: 1,
  flip: false,
  backendImageId: null,
  backendImageUrl: null,
  backendThumbnailUrl: null
};

// Image filters state
export const imgFilters = {
  blur: 0,
  brightness: 100,
  contrast: 100,
  grayscale: 0,
  hueRotate: 0,
  invert: 0,
  saturate: 100,
  sepia: 0,
  opacity: 100
};

// Filter presets
export const PRESETS = {
  none: { blur: 0, brightness: 100, contrast: 100, grayscale: 0, hueRotate: 0, invert: 0, saturate: 100, sepia: 0, opacity: 100 },
  vintage: { blur: 0, brightness: 110, contrast: 95, grayscale: 20, hueRotate: 15, invert: 0, saturate: 85, sepia: 30, opacity: 100 },
  bw: { blur: 0, brightness: 100, contrast: 110, grayscale: 100, hueRotate: 0, invert: 0, saturate: 0, sepia: 0, opacity: 100 },
  warm: { blur: 0, brightness: 105, contrast: 100, grayscale: 0, hueRotate: 25, invert: 0, saturate: 120, sepia: 10, opacity: 100 },
  cool: { blur: 0, brightness: 100, contrast: 105, grayscale: 0, hueRotate: 200, invert: 0, saturate: 110, sepia: 0, opacity: 100 },
  dramatic: { blur: 0, brightness: 95, contrast: 140, grayscale: 0, hueRotate: 0, invert: 0, saturate: 130, sepia: 0, opacity: 100 }
};

function saveAndRecord() {
  saveProjectDebounced();
  recordHistory();
}

// Get slide image helper function
function getSlideImage() {
  const slides = getSlides();
  const activeIndex = getActiveIndex();
  const slide = slides[activeIndex];
  return slide?.image || null;
}

// Format seconds helper
function fmtSec(ms) {
  return (ms / 1000).toFixed(1) + 's';
}

// ENHANCED: Convert absolute coordinates to percentages for sharing
export function getImagePositionAsPercentage() {
  if (!imgState.has) return null;
  
  const work = document.querySelector('#work');
  if (!work) return null;
  
  const rect = work.getBoundingClientRect();
  
  return {
    cxPercent: (imgState.cx / rect.width) * 100,
    cyPercent: (imgState.cy / rect.height) * 100,
    scale: imgState.scale,
    angle: imgState.angle,
    shearX: imgState.shearX,
    shearY: imgState.shearY,
    signX: imgState.signX,
    signY: imgState.signY,
    flip: imgState.flip
  };
}

// ENHANCED: Apply percentage-based coordinates when loading
export function setImagePositionFromPercentage(percentageData) {
  if (!percentageData) return;
  
  const work = document.querySelector('#work');
  if (!work) return;
  
  const rect = work.getBoundingClientRect();
  
  imgState.cx = (percentageData.cxPercent / 100) * rect.width;
  imgState.cy = (percentageData.cyPercent / 100) * rect.height;
  imgState.scale = percentageData.scale || 1;
  imgState.angle = percentageData.angle || 0;
  imgState.shearX = percentageData.shearX || 0;
  imgState.shearY = percentageData.shearY || 0;
  imgState.signX = percentageData.signX || 1;
  imgState.signY = percentageData.signY || 1;
  imgState.flip = percentageData.flip || false;
  
  setTransforms();
}

// Toggle upload button visibility
export function toggleUploadBtn() {
  const uploadBtn = document.getElementById('uploadBgBtn');
  if (uploadBtn) {
    uploadBtn.style.display = imgState.has ? 'none' : 'block';
  }
}

// Apply CSS filters to the image
export function applyFilters() {
  const userBg = document.querySelector('#userBg');
  if (!userBg) return;
  
  const { blur, brightness, contrast, grayscale, hueRotate, invert, saturate, sepia, opacity } = imgFilters;
  
  const filterString = [
    `blur(${blur}px)`,
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `grayscale(${grayscale}%)`,
    `hue-rotate(${hueRotate}deg)`,
    `invert(${invert}%)`,
    `saturate(${saturate}%)`,
    `sepia(${sepia}%)`,
    `opacity(${opacity}%)`
  ].join(' ');
  
  userBg.style.filter = filterString;
}

// Update image fade timing UI
export function updateImageFadeUI() {
  const img = getSlideImage();
  const imgFadeInBtn = document.getElementById('imgFadeInBtn');
  const imgFadeOutBtn = document.getElementById('imgFadeOutBtn');
  const imgFadeInRange = document.getElementById('imgFadeInRange');
  const imgFadeOutRange = document.getElementById('imgFadeOutRange');
  const imgFadeInVal = document.getElementById('imgFadeInVal');
  const imgFadeOutVal = document.getElementById('imgFadeOutVal');

  if (imgFadeInBtn) imgFadeInBtn.classList.toggle('active', (img?.fadeInMs || 0) > 0);
  if (imgFadeOutBtn) imgFadeOutBtn.classList.toggle('active', (img?.fadeOutMs || 0) > 0);
  
  if (imgFadeInRange) imgFadeInRange.value = img?.fadeInMs || 0;
  if (imgFadeOutRange) imgFadeOutRange.value = img?.fadeOutMs || 0;
  
  if (imgFadeInVal) imgFadeInVal.textContent = fmtSec(img?.fadeInMs || 0);
  if (imgFadeOutVal) imgFadeOutVal.textContent = fmtSec(img?.fadeOutMs || 0);
}

// Update image zoom timing UI
export function updateImageZoomUI() {
  const img = getSlideImage();
  const imgZoomInBtn = document.getElementById('imgZoomInBtn');
  const imgZoomOutBtn = document.getElementById('imgZoomOutBtn');
  const imgZoomInRange = document.getElementById('imgZoomInRange');
  const imgZoomOutRange = document.getElementById('imgZoomOutRange');
  const imgZoomInVal = document.getElementById('imgZoomInVal');
  const imgZoomOutVal = document.getElementById('imgZoomOutVal');

  if (imgZoomInBtn) imgZoomInBtn.classList.toggle('active', (img?.zoomInMs || 0) > 0);
  if (imgZoomOutBtn) imgZoomOutBtn.classList.toggle('active', (img?.zoomOutMs || 0) > 0);
  
  if (imgZoomInRange) imgZoomInRange.value = img?.zoomInMs || 0;
  if (imgZoomOutRange) imgZoomOutRange.value = img?.zoomOutMs || 0;
  
  if (imgZoomInVal) imgZoomInVal.textContent = fmtSec(img?.zoomInMs || 0);
  if (imgZoomOutVal) imgZoomOutVal.textContent = fmtSec(img?.zoomOutMs || 0);
}

// Sync image controls with current state
export function syncImageControls() {
  const imgScale = document.querySelector('#imgScale');
  const imgScaleVal = document.querySelector('#imgScaleVal');
  const imgRotate = document.querySelector('#imgRotate');
  const imgRotateVal = document.querySelector('#imgRotateVal');
  
  if (!imgState.has) {
    if (imgScaleVal) imgScaleVal.textContent = '—';
    if (imgRotateVal) imgRotateVal.textContent = '—';
    enableImageControls(false);
    return;
  }
  
  enableImageControls(true);
  
  if (imgScale && imgScaleVal) {
    imgScale.value = Math.max(imgScale.min, Math.min(imgScale.max, Math.round(imgState.scale * 100)));
    imgScaleVal.textContent = imgScale.value + '%';
  }
  
  if (imgRotate && imgRotateVal) {
    const deg = Math.round(imgState.angle * 180 / Math.PI);
    imgRotate.value = Math.max(imgRotate.min, Math.min(imgRotate.max, deg));
    imgRotateVal.textContent = deg + '°';
  }
  
  updateImageFadeUI();
  updateImageZoomUI();
}

// Enforce image bounds within work area
export function enforceImageBounds() {
  if (!imgState.has) return;
  
  const work = document.querySelector('#work');
  if (!work) return;
  
  const r = work.getBoundingClientRect();
  const w = imgState.natW * imgState.scale;
  const h = imgState.natH * imgState.scale;
  
  // Keep image center within reasonable bounds
  imgState.cx = clamp(imgState.cx, w / 2, r.width - w / 2);
  imgState.cy = clamp(imgState.cy, h / 2, r.height - h / 2);
}

// ENHANCED: Set image transforms with viewer mode support
export function setTransforms() {
  const body = document.body;
  const userBgWrap = document.querySelector('#userBgWrap');
  const bgBox = document.querySelector('#bgBox');
  const inViewer = body.classList.contains('viewer');
  const inPreview = body.classList.contains('preview') || inViewer;

  if (!imgState.has) {
    if (bgBox) bgBox.classList.add('hidden');
    if (userBgWrap) {
      userBgWrap.style.width = '0px';
      userBgWrap.style.height = '0px';
    }
    applyFilters();
    syncImageControls();
    return;
  }
  
  // Don't enforce bounds in viewer mode to maintain positioning
  if (!inViewer) {
    enforceImageBounds();
  }
  
  const w = imgState.natW * imgState.scale;
  const h = imgState.natH * imgState.scale;
  const sx = (imgState.flip ? -1 : 1) * (imgState.signX ?? 1);
  const sy = imgState.signY ?? 1;
  
  const base = [
    'translate(-50%,-50%)',
    `rotate(${imgState.angle}rad)`,
    `skew(${imgState.shearX}rad, ${imgState.shearY}rad)`,
    `scale(${imgState.scale * sx}, ${imgState.scale * sy})`
  ].join(' ');

  if (userBgWrap) {
    userBgWrap.style.width = w + 'px';
    userBgWrap.style.height = h + 'px';
    userBgWrap.style.left = imgState.cx + 'px';
    userBgWrap.style.top = imgState.cy + 'px';
    userBgWrap.style.transform = base;
    
    // Ensure proper z-index in viewer mode
    if (inViewer) {
      userBgWrap.style.zIndex = '15'; // Below fx video (z-index 18)
    }
  }

  if (bgBox && !inPreview) {
    bgBox.classList.remove('hidden');
    bgBox.style.width = w + 'px';
    bgBox.style.height = h + 'px';
    bgBox.style.left = imgState.cx + 'px';
    bgBox.style.top = imgState.cy + 'px';
    bgBox.style.transform = base;
  } else if (bgBox) {
    bgBox.classList.add('hidden');
  }

  applyFilters();
  syncImageControls();
}

// CRITICAL: Save image data to slide for persistence
function saveImageToSlide(src, imageData) {
  try {
    const slides = getSlides();
    const activeIndex = getActiveIndex();
    
    if (slides && slides[activeIndex]) {
      // Get percentage position for sharing compatibility
      const percentagePos = getImagePositionAsPercentage();
      
      // Create/update image object in slide
      slides[activeIndex].image = {
        src: src,
        thumb: imageData.backendThumbnailUrl || src,
        // Store both absolute and percentage coordinates for compatibility
        cx: imgState.cx,
        cy: imgState.cy,
        // Store percentage coordinates for consistent cross-device sharing
        cxPercent: percentagePos?.cxPercent,
        cyPercent: percentagePos?.cyPercent,
        ...imageData
      };
      
      // Save updated slides
      setSlides([...slides]);
      
      // Write to storage asynchronously
      setTimeout(() => {
        import('./slide-manager.js').then(({ writeCurrentSlide }) => {
          writeCurrentSlide();
        }).catch(error => {
          console.warn('Failed to write slide after image save:', error);
        });
      }, 0);
      
      console.log('Image data saved to slide with percentage positioning:', activeIndex);
    }
  } catch (error) {
    console.error('Failed to save image to slide:', error);
  }
}

// Handle image upload with persistence
export async function handleImageUpload(file) {
  // Validate file size first
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  if (file.size > maxSize) {
    console.error('Image too large (max 10MB)');
    return;
  }

  // Try backend upload first if user is logged in
  if (apiClient.token) {
    try {
      const response = await apiClient.uploadImage(file);
      const userBgEl = document.querySelector('#userBg');
      const work = document.querySelector('#work');
      
      userBgEl.onload = () => {
        try {
          imgState.natW = userBgEl.naturalWidth;
          imgState.natH = userBgEl.naturalHeight;
          
          if (!imgState.natW || !imgState.natH) {
            throw new Error('Invalid image dimensions');
          }
          
          const r = work.getBoundingClientRect();

          // Set default scale so image fits entirely within work area
          const scaleToFitWidth = r.width / imgState.natW;
          const scaleToFitHeight = r.height / imgState.natH;

          const { shearX, shearY } = imgState;

          // Use the smaller scale and avoid upscaling beyond 100%
          imgState.scale = Math.min(1, scaleToFitWidth, scaleToFitHeight);
          imgState.angle = 0;
          imgState.signX = 1;
          imgState.signY = 1;
          imgState.flip = false;
          imgState.cx = r.width / 2;
          imgState.cy = r.height / 2;
          imgState.has = true;
          imgState.shearX = shearX;
          imgState.shearY = shearY;
          
          // Reset filters
          Object.assign(imgFilters, PRESETS.none);
          highlightPreset('none');
          updatePresetThumb();
          setTransforms();
          toggleUploadBtn();
          
          // Store backend image info for saving
          imgState.backendImageId = response.imageId;
          imgState.backendImageUrl = response.url;
          imgState.backendThumbnailUrl = response.thumbnailUrl;

          // CRITICAL: Save to project with backend info
          saveImageToSlide(response.url, {
            scale: imgState.scale,
            angle: imgState.angle,
            cx: imgState.cx,
            cy: imgState.cy,
            shearX: imgState.shearX,
            shearY: imgState.shearY,
            signX: imgState.signX,
            signY: imgState.signY,
            flip: imgState.flip,
            natW: imgState.natW,
            natH: imgState.natH,
            backendImageId: response.imageId,
            backendImageUrl: response.url,
            backendThumbnailUrl: response.thumbnailUrl,
            isLocal: false
          });
          saveAndRecord();
          
          console.log('Backend image uploaded and saved to project');
          
        } catch (error) {
          console.error('Error processing uploaded image:', error);
          imgState.has = false;
        }
      };
      
      userBgEl.onerror = () => {
        console.error('Failed to load backend image');
        fallbackToLocalUpload(file);
      };
      
      userBgEl.src = response.url;
      return;
      
    } catch (error) {
      console.error('Backend upload failed, using local fallback:', error);
    }
  }
  
  // Fallback to local upload
  fallbackToLocalUpload(file);
}

// Local upload fallback with persistence
function fallbackToLocalUpload(file) {
  const userBgEl = document.querySelector('#userBg');
  const work = document.querySelector('#work');
  
  userBgEl.onload = () => {
    try {
      imgState.natW = userBgEl.naturalWidth;
      imgState.natH = userBgEl.naturalHeight;
      
      if (!imgState.natW || !imgState.natH) {
        throw new Error('Invalid image dimensions');
      }
      
      const r = work.getBoundingClientRect();
      
      // Set default scale so image fits within work area
      const scaleToFitWidth = r.width / imgState.natW;
      const scaleToFitHeight = r.height / imgState.natH;

      const { shearX, shearY, signX, signY, flip } = imgState;
      imgState.scale = Math.min(1, scaleToFitWidth, scaleToFitHeight);
      imgState.angle = 0;
      imgState.cx = r.width / 2;
      imgState.cy = r.height / 2;
      imgState.has = true;
      imgState.shearX = shearX;
      imgState.shearY = shearY;
      imgState.signX = signX;
      imgState.signY = signY;
      imgState.flip = flip;

      // Reset filters
      Object.assign(imgFilters, PRESETS.none);
      highlightPreset('none');
      updatePresetThumb();
      setTransforms();
      toggleUploadBtn();
      
      // Clear backend info for local images
      delete imgState.backendImageId;
      delete imgState.backendImageUrl;
      delete imgState.backendThumbnailUrl;
      
      // CRITICAL: Save local image data to project
      saveImageToSlide(userBgEl.src, {
        scale: imgState.scale,
        angle: imgState.angle,
        cx: imgState.cx,
        cy: imgState.cy,
        shearX: imgState.shearX,
        shearY: imgState.shearY,
        signX: imgState.signX,
        signY: imgState.signY,
        flip: imgState.flip,
        natW: imgState.natW,
        natH: imgState.natH,
        isLocal: true // Flag to indicate this is a local data URL
      });
      saveAndRecord();
      
      console.log('Local image loaded and saved to project');
      
    } catch (error) {
      console.error('Error processing local image:', error);
      imgState.has = false;
      setTransforms();
    }
  };
  
  userBgEl.onerror = () => {
    console.error('Failed to load local image');
    imgState.has = false;
    setTransforms();
  };
  
  // Create data URL for local file
  const reader = new FileReader();
  reader.onload = e => {
    userBgEl.src = e.target.result;
  };
  reader.onerror = () => {
    console.error('Failed to read image file');
    imgState.has = false;
    setTransforms();
  };
  reader.readAsDataURL(file);
}

// Update preset thumbnail
export function updatePresetThumb() {
  const work = document.querySelector('#work');
  const userBgEl = document.querySelector('#userBg');
  if (!work || !userBgEl) return;
  
  const url = userBgEl.src ? userBgEl.src : '';
  if (url) work.style.setProperty('--thumb-url', `url("${url}")`);
}

// Highlight active preset
export function highlightPreset(name) {
  const presetGrid = document.querySelector('#presetGrid');
  if (!presetGrid) return;
  
  [...presetGrid.querySelectorAll('.preset-btn')].forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.preset === name ? 'true' : 'false');
  });
}

// Detect current preset from filters
export function detectPresetFromFilters() {
  for (const [name, vals] of Object.entries(PRESETS)) {
    let same = true;
    for (const k in vals) {
      if (+imgFilters[k] !== +vals[k]) {
        same = false;
        break;
      }
    }
    if (same) return name;
  }
  return 'none';
}

// Apply preset filters
export function applyPreset(name) {
  Object.assign(imgFilters, PRESETS[name] || PRESETS.none);
  highlightPreset(name);
  setTransforms();
  saveAndRecord();
}

// Image controls management
export function enableImageControls(on) {
  const imgScale = document.querySelector('#imgScale');
  const imgRotate = document.querySelector('#imgRotate');
  const imgFlipBtn = document.querySelector('#imgFlip');
  const imgReplaceBtn = document.querySelector('#imgReplace');
  const imgFadeInBtn = document.getElementById('imgFadeInBtn');
  const imgFadeOutBtn = document.getElementById('imgFadeOutBtn');
  const imgFadeInRange = document.getElementById('imgFadeInRange');
  const imgFadeOutRange = document.getElementById('imgFadeOutRange');
  const imgZoomInBtn = document.getElementById('imgZoomInBtn');
  const imgZoomOutBtn = document.getElementById('imgZoomOutBtn');
  const imgZoomInRange = document.getElementById('imgZoomInRange');
  const imgZoomOutRange = document.getElementById('imgZoomOutRange');
  const presetGrid = document.querySelector('#presetGrid');

  [imgScale, imgRotate, imgFlipBtn, imgReplaceBtn, imgFadeInBtn, imgFadeOutBtn, imgFadeInRange, imgFadeOutRange,
   imgZoomInBtn, imgZoomOutBtn, imgZoomInRange, imgZoomOutRange].forEach(el => {
    if (el) el.disabled = !on;
  });
  
  if (presetGrid) {
    [...presetGrid.querySelectorAll('.preset-btn')].forEach(b => b.disabled = !on);
  }
}

// Image fade handlers
export function handleImageFadeIn() {
  const img = getSlideImage();
  if (!img) return;
  img.fadeInMs = (img.fadeInMs || 0) > 0 ? 0 : 800;
  updateImageFadeUI();
  saveImageSettings();
  saveAndRecord();
}

export function handleImageFadeOut() {
  const img = getSlideImage();
  if (!img) return;
  img.fadeOutMs = (img.fadeOutMs || 0) > 0 ? 0 : 800;
  updateImageFadeUI();
  saveImageSettings();
  saveAndRecord();
}

export function handleImageFadeInRange(value) {
  const img = getSlideImage();
  if (!img) return;
  img.fadeInMs = parseInt(value, 10) || 0;
  const imgFadeInVal = document.getElementById('imgFadeInVal');
  if (imgFadeInVal) imgFadeInVal.textContent = fmtSec(img.fadeInMs);
  saveImageSettings();
}

export function handleImageFadeOutRange(value) {
  const img = getSlideImage();
  if (!img) return;
  img.fadeOutMs = parseInt(value, 10) || 0;
  const imgFadeOutVal = document.getElementById('imgFadeOutVal');
  if (imgFadeOutVal) imgFadeOutVal.textContent = fmtSec(img.fadeOutMs);
  saveImageSettings();
}

// Image zoom handlers
export function handleImageZoomIn() {
  const img = getSlideImage();
  if (!img) return;
  img.zoomInMs = (img.zoomInMs || 0) > 0 ? 0 : 800;
  updateImageZoomUI();
  saveImageSettings();
  saveAndRecord();
}

export function handleImageZoomOut() {
  const img = getSlideImage();
  if (!img) return;
  img.zoomOutMs = (img.zoomOutMs || 0) > 0 ? 0 : 800;
  updateImageZoomUI();
  saveImageSettings();
  saveAndRecord();
}

export function handleImageZoomInRange(value) {
  const img = getSlideImage();
  if (!img) return;
  img.zoomInMs = parseInt(value, 10) || 0;
  const imgZoomInVal = document.getElementById('imgZoomInVal');
  if (imgZoomInVal) imgZoomInVal.textContent = fmtSec(img.zoomInMs);
  saveImageSettings();
}

export function handleImageZoomOutRange(value) {
  const img = getSlideImage();
  if (!img) return;
  img.zoomOutMs = parseInt(value, 10) || 0;
  const imgZoomOutVal = document.getElementById('imgZoomOutVal');
  if (imgZoomOutVal) imgZoomOutVal.textContent = fmtSec(img.zoomOutMs);
  saveImageSettings();
}

// Image scaling and rotation handlers
export function handleImageScale(value) {
  if (!imgState.has) return;
  imgState.scale = clamp(parseInt(value, 10) / 100, 0.05, 10);
  enforceImageBounds();
  setTransforms();
  saveImageSettings();
  saveAndRecord();
}

// Image rotate handler (UI slider gives degrees; we store radians)
export function handleImageRotate(value) {
  if (!imgState.has) return;
  const deg = parseInt(value, 10) || 0;
  imgState.angle = deg * Math.PI / 180; // store in radians
  enforceImageBounds();
  setTransforms();
  saveImageSettings();
  saveAndRecord();
}

// Image flip handler
export function handleImageFlip() {
  if (!imgState.has) return;
  imgState.flip = !imgState.flip;
  setTransforms();
  saveImageSettings();
  saveAndRecord();
}

// Save current image settings to slide
function saveImageSettings() {
  if (!imgState.has) return;
  
  try {
    setTimeout(() => {
      import('./slide-manager.js').then(({ writeCurrentSlide }) => {
        writeCurrentSlide();
      }).catch(error => {
        console.warn('Failed to write slide after image settings change:', error);
      });
    }, 0);
  } catch (error) {
    console.warn('Failed to save image settings:', error);
  }
}

// Preload cache for performance
export const preloadCache = new Map();

export function preloadSlideImageAt(idx) {
  const slides = getSlides();
  if (!slides?.length) return Promise.resolve();
  
  const i = ((idx % slides.length) + slides.length) % slides.length;
  const s = slides[i];
  const src = s?.image?.src || s?.image?.thumb;
  
  if (!src) return Promise.resolve();
  if (preloadCache.get(src) === true) return Promise.resolve();

  return new Promise(resolve => {
    const im = new Image();
    im.onload = () => {
      preloadCache.set(src, true);
      resolve();
    };
    im.onerror = () => resolve();
    im.src = src;
  });
}

// Filter handling for individual sliders
export function handleBlur(value) {
  imgFilters.blur = clamp(parseInt(value, 10), 0, 20);
  setTransforms();
  saveAndRecord();
}

export function handleBrightness(value) {
  imgFilters.brightness = clamp(parseInt(value, 10), 0, 200);
  setTransforms();
  saveAndRecord();
}

export function handleContrast(value) {
  imgFilters.contrast = clamp(parseInt(value, 10), 0, 200);
  setTransforms();
  saveAndRecord();
}

export function handleGrayscale(value) {
  imgFilters.grayscale = clamp(parseInt(value, 10), 0, 100);
  setTransforms();
  saveAndRecord();
}

export function handleHueRotate(value) {
  imgFilters.hueRotate = clamp(parseInt(value, 10), 0, 360);
  setTransforms();
  saveAndRecord();
}

export function handleInvert(value) {
  imgFilters.invert = clamp(parseInt(value, 10), 0, 100);
  setTransforms();
  saveAndRecord();
}

export function handleSaturate(value) {
  imgFilters.saturate = clamp(parseInt(value, 10), 0, 200);
  setTransforms();
  saveAndRecord();
}

export function handleSepia(value) {
  imgFilters.sepia = clamp(parseInt(value, 10), 0, 100);
  setTransforms();
  saveAndRecord();
}

export function handleOpacity(value) {
  imgFilters.opacity = clamp(parseInt(value, 10), 0, 100);
  setTransforms();
  saveAndRecord();
}

// ENHANCED: Debug and fix functions for positioning
export function debugImagePositioning() {
  const work = document.querySelector('#work');
  const userBgWrap = document.querySelector('#userBgWrap');
  const fxVideo = document.querySelector('#fxVideo');
  
  if (!work || !userBgWrap || !fxVideo) {
    console.log('❌ Missing elements for debugging');
    return;
  }
  
  const workRect = work.getBoundingClientRect();
  const videoRect = fxVideo.getBoundingClientRect();
  const imageRect = userBgWrap.getBoundingClientRect();
  const percentagePos = getImagePositionAsPercentage();
  
  console.log('🔍 Image Positioning Debug:', {
    workArea: {
      width: workRect.width,
      height: workRect.height,
      aspectRatio: workRect.width / workRect.height
    },
    fxVideo: {
      width: videoRect.width,
      height: videoRect.height,
      position: 'covers entire work area'
    },
    userImage: {
      width: imageRect.width,
      height: imageRect.height,
      centerX: imageRect.left + imageRect.width / 2 - workRect.left,
      centerY: imageRect.top + imageRect.height / 2 - workRect.top,
      transform: userBgWrap.style.transform
    },
    imgState: {
      cx: imgState.cx,
      cy: imgState.cy,
      scale: imgState.scale,
      has: imgState.has
    },
    percentagePosition: percentagePos
  });
  
  // Create visual debug overlay
  const overlay = document.querySelector('.debug-positioning') || document.createElement('div');
  overlay.className = 'debug-positioning';
  overlay.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    pointer-events: none;
  `;
  overlay.innerHTML = `
    <strong>Image Position Debug</strong><br>
    Work: ${Math.round(workRect.width)}×${Math.round(workRect.height)}<br>
    Video: ${Math.round(videoRect.width)}×${Math.round(videoRect.height)}<br>
    Image: ${Math.round(imageRect.width)}×${Math.round(imageRect.height)}<br>
    Center: ${Math.round(imgState.cx)}, ${Math.round(imgState.cy)}<br>
    Percent: ${Math.round(percentagePos?.cxPercent || 0)}%, ${Math.round(percentagePos?.cyPercent || 0)}%<br>
    Scale: ${Math.round(imgState.scale * 100)}%<br>
    Mode: ${document.body.classList.contains('viewer') ? 'Viewer' : 'Editor'}
  `;
  
  if (!overlay.parentElement) {
    document.body.appendChild(overlay);
  }
  
  // Auto-remove after 10 seconds
  setTimeout(() => overlay.remove(), 10000);
}

// ENHANCED: Quick fix to center image to match fx video
export async function centerImageToVideo() {
  if (!imgState.has) {
    console.log('❌ No image to center');
    return;
  }
  
  const work = document.querySelector('#work');
  if (!work) {
    console.log('❌ Work area not found');
    return;
  }
  
  const rect = work.getBoundingClientRect();
  
  // Center the image in the work area (matching fx video positioning)
  imgState.cx = rect.width / 2;
  imgState.cy = rect.height / 2;
  
  // Optionally adjust scale to better match video coverage
  const imageAspect = imgState.natW / imgState.natH;
  const workAspect = rect.width / rect.height;
  
  if (imageAspect !== workAspect) {
    // Scale to cover (similar to object-fit: cover)
    const scaleToFit = Math.max(
      rect.width / imgState.natW,
      rect.height / imgState.natH
    );
    imgState.scale = scaleToFit;
  }
  
  setTransforms();
  saveImageSettings();
  console.log('✅ Image centered and scaled to match fx video');
}

// Validation function for debugging image persistence
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
    console.log('ImgState src:', document.querySelector('#userBg')?.src?.substring(0, 50) + '...');
    console.log('Percentage position available:', !!currentSlide?.image?.cxPercent);
    console.log('================================');
  } catch (error) {
    console.error('Failed to validate image persistence:', error);
  }
}

// Make functions available globally for console debugging
if (typeof window !== 'undefined') {
  window.validateImagePersistence = validateImagePersistence;
  window.debugImagePositioning = debugImagePositioning;
  window.centerImageToVideo = centerImageToVideo;
  window.getImagePositionAsPercentage = getImagePositionAsPercentage;
  window.setImagePositionFromPercentage = setImagePositionFromPercentage;
}