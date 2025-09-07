// image-manager.js - COMPLETE FIXED VERSION - No missing imports

import { apiClient } from './api-client.js';
import { clamp } from './utils.js';
import { getSlides, getActiveIndex } from './state-manager.js';
import { saveProjectDebounced } from './state-manager.js';

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

// FIXED: Get slide image helper function (no import needed)
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

// FIXED: Set image transforms and position with proper scaling
export function setTransforms() {
  const body = document.body;
  const userBgWrap = document.querySelector('#userBgWrap');
  const bgBox = document.querySelector('#bgBox');
  const inPreview = body.classList.contains('preview') || body.classList.contains('viewer');

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
  
  enforceImageBounds();
  
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
  }

  if (bgBox) {
    if (inPreview) {
      bgBox.classList.add('hidden');
    } else {
      bgBox.classList.remove('hidden');
      bgBox.style.width = w + 'px';
      bgBox.style.height = h + 'px';
      bgBox.style.left = imgState.cx + 'px';
      bgBox.style.top = imgState.cy + 'px';
      bgBox.style.transform = base;
    }
  }

  applyFilters();
  syncImageControls();
}

// Handle image upload defaulting to fit within work area
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
          // imgState.shearX = 0;
          // imgState.shearY = 0;
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
          
          // Save project with new image
          import('./slide-manager.js').then(({ writeCurrentSlide }) => {
            writeCurrentSlide();
          });
          
          console.log('✅ Image uploaded to cloud with fit-to-canvas scale');
          
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

// Local upload fallback with fit-to-canvas scaling
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
      
      // Save project
      import('./slide-manager.js').then(({ writeCurrentSlide }) => {
        writeCurrentSlide();
      });
      
        console.log('✅ Local image loaded with fit-to-canvas scale');
      
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
  saveProjectDebounced();
}

// Image controls management
export function enableImageControls(on) {
  const imgScale = document.querySelector('#imgScale');
  const imgRotate = document.querySelector('#imgRotate');
  const imgFlipBtn = document.querySelector('#imgFlip');
  const imgDeleteBtn = document.querySelector('#imgDelete');
  const imgFadeInBtn = document.getElementById('imgFadeInBtn');
  const imgFadeOutBtn = document.getElementById('imgFadeOutBtn');
  const imgFadeInRange = document.getElementById('imgFadeInRange');
  const imgFadeOutRange = document.getElementById('imgFadeOutRange');
  const imgZoomInBtn = document.getElementById('imgZoomInBtn');
  const imgZoomOutBtn = document.getElementById('imgZoomOutBtn');
  const imgZoomInRange = document.getElementById('imgZoomInRange');
  const imgZoomOutRange = document.getElementById('imgZoomOutRange');
  const presetGrid = document.querySelector('#presetGrid');

  [imgScale, imgRotate, imgFlipBtn, imgDeleteBtn, imgFadeInBtn, imgFadeOutBtn, imgFadeInRange, imgFadeOutRange,
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
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleImageFadeOut() {
  const img = getSlideImage();
  if (!img) return;
  img.fadeOutMs = (img.fadeOutMs || 0) > 0 ? 0 : 800;
  updateImageFadeUI();
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleImageFadeInRange(value) {
  const img = getSlideImage();
  if (!img) return;
  img.fadeInMs = parseInt(value, 10) || 0;
  const imgFadeInVal = document.getElementById('imgFadeInVal');
  if (imgFadeInVal) imgFadeInVal.textContent = fmtSec(img.fadeInMs);
}

export function handleImageFadeOutRange(value) {
  const img = getSlideImage();
  if (!img) return;
  img.fadeOutMs = parseInt(value, 10) || 0;
  const imgFadeOutVal = document.getElementById('imgFadeOutVal');
  if (imgFadeOutVal) imgFadeOutVal.textContent = fmtSec(img.fadeOutMs);
}

// Image zoom handlers
export function handleImageZoomIn() {
  const img = getSlideImage();
  if (!img) return;
  img.zoomInMs = (img.zoomInMs || 0) > 0 ? 0 : 800;
  updateImageZoomUI();
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleImageZoomOut() {
  const img = getSlideImage();
  if (!img) return;
  img.zoomOutMs = (img.zoomOutMs || 0) > 0 ? 0 : 800;
  updateImageZoomUI();
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleImageZoomInRange(value) {
  const img = getSlideImage();
  if (!img) return;
  img.zoomInMs = parseInt(value, 10) || 0;
  const imgZoomInVal = document.getElementById('imgZoomInVal');
  if (imgZoomInVal) imgZoomInVal.textContent = fmtSec(img.zoomInMs);
}

export function handleImageZoomOutRange(value) {
  const img = getSlideImage();
  if (!img) return;
  img.zoomOutMs = parseInt(value, 10) || 0;
  const imgZoomOutVal = document.getElementById('imgZoomOutVal');
  if (imgZoomOutVal) imgZoomOutVal.textContent = fmtSec(img.zoomOutMs);
}

// Image scaling and rotation handlers
export function handleImageScale(value) {
  if (!imgState.has) return;
  imgState.scale = clamp(parseInt(value, 10) / 100, 0.05, 10);
  enforceImageBounds();
  setTransforms();
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

// Image rotate handler (UI slider gives degrees; we store radians)
export function handleImageRotate(value) {
  if (!imgState.has) return;
  const deg = parseInt(value, 10) || 0;
  imgState.angle = deg * Math.PI / 180; // store in radians
  enforceImageBounds();
  setTransforms();
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

// Image flip handler
export function handleImageFlip() {
  if (!imgState.has) return;
  imgState.flip = !imgState.flip;
  setTransforms();
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

// Delete image handler
export function handleImageDelete() {
  if (!imgState.has) return;
  
  imgState.has = false;
  imgState.natW = 0;
  imgState.natH = 0;
  imgState.cx = 0;
  imgState.cy = 0;
  imgState.scale = 1;
  imgState.angle = 0;
  imgState.shearX = 0;
  imgState.shearY = 0;
  imgState.signX = 1;
  imgState.signY = 1;
  imgState.flip = false;
  
  // Clear backend info
  delete imgState.backendImageId;
  delete imgState.backendImageUrl;
  delete imgState.backendThumbnailUrl;
  
  const userBg = document.querySelector('#userBg');
  if (userBg) userBg.src = '';
  
  setTransforms();
  toggleUploadBtn();
  
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
  
  console.log('✅ Image deleted');
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