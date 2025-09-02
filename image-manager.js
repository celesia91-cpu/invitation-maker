// image-manager.js - Image handling, filters, and transformations

import { apiClient } from './api-client.js';
import { clamp, workSize, fmtSec } from './utils.js';
import { saveProjectDebounced, getSlides, getActiveIndex } from './state-manager.js';

// Image state
export const imgState = { has: false, natW: 0, natH: 0, cx: 0, cy: 0, scale: 1, angle: 0, flip: false, backendImageId: null, backendImageUrl: null, backendThumbnailUrl: null };
export const imgFilters = { brightness: 100, contrast: 100, saturation: 100, hue: 0, sepia: 0, blur: 0, grayscale: 0 };

// Filter presets
export const PRESETS = {
  none: { brightness: 100, contrast: 100, saturation: 100, hue: 0, sepia: 0, blur: 0, grayscale: 0 },
  warm: { brightness: 102, contrast: 105, saturation: 120, hue: 10, sepia: 10, blur: 0, grayscale: 0 },
  cool: { brightness: 100, contrast: 105, saturation: 105, hue: -12, sepia: 0, blur: 0, grayscale: 0 },
  mono: { brightness: 100, contrast: 120, saturation: 100, hue: 0, sepia: 0, blur: 0, grayscale: 100 },
  vintage: { brightness: 105, contrast: 95, saturation: 85, hue: 5, sepia: 35, blur: 0.5, grayscale: 0 },
  dramatic: { brightness: 90, contrast: 140, saturation: 80, hue: 0, sepia: 0, blur: 0, grayscale: 0 }
};

// Filter CSS generation
export function buildFilterCSS(f) {
  return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) sepia(${f.sepia}%) hue-rotate(${f.hue}deg) blur(${f.blur}px) grayscale(${f.grayscale}%)`;
}

// Apply filters to image
export function applyFilters() {
  const userBgEl = document.querySelector('#userBg');
  userBgEl.style.filter = imgState.has ? buildFilterCSS(imgFilters) : 'none';
}

// Update preset thumbnail
export function updatePresetThumb() {
  const work = document.querySelector('#work');
  const userBgEl = document.querySelector('#userBg');
  const url = imgState.has ? userBgEl.src : '';
  if (url) work.style.setProperty('--thumb-url', `url("${url}")`);
}

// Highlight active preset
export function highlightPreset(name) {
  const presetGrid = document.querySelector('#presetGrid');
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
  const presetGrid = document.querySelector('#presetGrid');
  
  [imgScale, imgRotate, imgFlipBtn, imgDeleteBtn, imgFadeInBtn, imgFadeOutBtn, imgFadeInRange, imgFadeOutRange].forEach(el => {
    if (el) el.disabled = !on;
  });
  [...presetGrid.querySelectorAll('.preset-btn')].forEach(b => b.disabled = !on);
}

// Sync image controls with current state
export function syncImageControls() {
  const imgScale = document.querySelector('#imgScale');
  const imgScaleVal = document.querySelector('#imgScaleVal');
  const imgRotate = document.querySelector('#imgRotate');
  const imgRotateVal = document.querySelector('#imgRotateVal');
  
  if (!imgState.has) {
    imgScaleVal.textContent = '—';
    imgRotateVal.textContent = '—';
    enableImageControls(false);
    return;
  }
  
  enableImageControls(true);
  imgScale.value = Math.max(imgScale.min, Math.min(imgScale.max, Math.round(imgState.scale * 100)));
  imgScaleVal.textContent = imgScale.value + '%';
  const deg = Math.round(imgState.angle * 180 / Math.PI);
  imgRotate.value = Math.max(imgRotate.min, Math.min(imgRotate.max, deg));
  imgRotateVal.textContent = deg + '°';
  updateImageFadeUI();
}

// Enforce image bounds within work area
export function enforceImageBounds() {
  if (!imgState.has) return;
  const work = document.querySelector('#work');
  const r = work.getBoundingClientRect();
  const w = imgState.natW * imgState.scale;
  const h = imgState.natH * imgState.scale;
  imgState.cx = clamp(imgState.cx, w / 2, r.width - w / 2);
  imgState.cy = clamp(imgState.cy, h / 2, r.height - h / 2);
}

// Set image transforms and position
export function setTransforms() {
  const body = document.body;
  const userBgWrap = document.querySelector('#userBgWrap');
  const bgBox = document.querySelector('#bgBox');
  const inPreview = body.classList.contains('preview') || body.classList.contains('viewer');

  if (!imgState.has) {
    bgBox.classList.add('hidden');
    userBgWrap.style.width = '0px';
    userBgWrap.style.height = '0px';
    applyFilters();
    syncImageControls();
    return;
  }
  
  enforceImageBounds();
  const w = imgState.natW * imgState.scale;
  const h = imgState.natH * imgState.scale;
  const sx = imgState.flip ? -1 : 1;
  const base = `translate(-50%,-50%) rotate(${imgState.angle}rad) scaleX(${sx})`;

  userBgWrap.style.width = w + 'px';
  userBgWrap.style.height = h + 'px';
  userBgWrap.style.left = imgState.cx + 'px';
  userBgWrap.style.top = imgState.cy + 'px';
  userBgWrap.style.transform = base;

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

  applyFilters();
  syncImageControls();
}

export async function handleImageUpload(file) {
  // Validate file size first
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  if (file.size > maxSize) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = 'Image too large (max 10MB)';
      setTimeout(() => statusText.textContent = '', 3000);
    }
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
          const s = Math.min(r.width * 0.95 / imgState.natW, r.height * 0.95 / imgState.natH);
          imgState.scale = s;
          imgState.angle = 0;
          imgState.flip = false;
          imgState.cx = r.width / 2;
          imgState.cy = r.height / 2;
          imgState.has = true;
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
          
          const statusText = document.getElementById('statusText');
          if (statusText) {
            statusText.textContent = 'Image uploaded to cloud';
            setTimeout(() => statusText.textContent = '', 2000);
          }
          
        } catch (error) {
          console.error('Error processing uploaded image:', error);
          imgState.has = false;
          const statusText = document.getElementById('statusText');
          if (statusText) {
            statusText.textContent = 'Invalid image file';
            setTimeout(() => statusText.textContent = '', 3000);
          }
        }
      };
      
      userBgEl.onerror = () => {
        console.error('Failed to load backend image');
        fallbackToLocalUpload(file);
      };
      
      userBgEl.src = response.url;
      return;
      
    } catch (error) {
      console.error('Backend upload failed, using local storage:', error);
      const statusText = document.getElementById('statusText');
      if (statusText) {
        statusText.textContent = 'Using local storage';
        setTimeout(() => statusText.textContent = '', 2000);
      }
      // Fall through to local upload
    }
  }
  
  // Fallback to local file reading (existing logic)
  fallbackToLocalUpload(file);
}

// Helper function for local file upload fallback
function fallbackToLocalUpload(file) {
  const reader = new FileReader();
  const userBgEl = document.querySelector('#userBg');
  const work = document.querySelector('#work');
  
  reader.onload = evt => {
    userBgEl.onload = () => {
      try {
        imgState.natW = userBgEl.naturalWidth;
        imgState.natH = userBgEl.naturalHeight;
        
        if (!imgState.natW || !imgState.natH) {
          throw new Error('Invalid image dimensions');
        }
        
        const r = work.getBoundingClientRect();
        const s = Math.min(r.width * 0.95 / imgState.natW, r.height * 0.95 / imgState.natH);
        imgState.scale = s;
        imgState.angle = 0;
        imgState.flip = false;
        imgState.cx = r.width / 2;
        imgState.cy = r.height / 2;
        imgState.has = true;
        
        // Clear backend image info since this is local
        imgState.backendImageId = null;
        imgState.backendImageUrl = null;
        imgState.backendThumbnailUrl = null;
        
        Object.assign(imgFilters, PRESETS.none);
        highlightPreset('none');
        updatePresetThumb();
        setTransforms();
        toggleUploadBtn();
        
        import('./slide-manager.js').then(({ writeCurrentSlide }) => {
          writeCurrentSlide();
        });
        
      } catch (error) {
        console.error('Error processing local image:', error);
        imgState.has = false;
        const statusText = document.getElementById('statusText');
        if (statusText) {
          statusText.textContent = 'Invalid image file';
          setTimeout(() => statusText.textContent = '', 3000);
        }
      }
    };
    
    userBgEl.onerror = () => {
      console.error('Failed to load local image');
      const statusText = document.getElementById('statusText');
      if (statusText) {
        statusText.textContent = 'Failed to load image';
        setTimeout(() => statusText.textContent = '', 3000);
      }
    };
    
    userBgEl.src = evt.target.result;
  };
  
  reader.onerror = () => {
    console.error('Failed to read image file');
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = 'Failed to read file';
      setTimeout(() => statusText.textContent = '', 3000);
    }
  };
  
  reader.readAsDataURL(file);
}

// Delete image
export function deleteImage() {
  if (!imgState.has) return;
  
  const userBgEl = document.querySelector('#userBg');
  const userBgWrap = document.querySelector('#userBgWrap');
  const bgBox = document.querySelector('#bgBox');
  
  imgState.has = false;
  userBgEl.src = '';
  userBgWrap.style.width = '0px';
  userBgWrap.style.height = '0px';
  userBgEl.style.filter = 'none';
  bgBox.classList.add('hidden');
  toggleUploadBtn();
  syncImageControls();
  highlightPreset('none');
  updateImageFadeUI();
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

// Toggle upload button visibility
export function toggleUploadBtn() {
  const uploadBgBtn = document.querySelector('#uploadBgBtn');
  uploadBgBtn.style.display = imgState.has ? 'none' : 'inline-block';
}

// Image fade UI management
export function getSlideImage() {
  const slides = getSlides();
  const activeIndex = getActiveIndex();
  const s = slides[activeIndex];
  return s?.image || null;
}

export function updateImageFadeUI() {
  const imgFadeInBtn = document.getElementById('imgFadeInBtn');
  const imgFadeOutBtn = document.getElementById('imgFadeOutBtn');
  const imgFadeInRange = document.getElementById('imgFadeInRange');
  const imgFadeOutRange = document.getElementById('imgFadeOutRange');
  const imgFadeInVal = document.getElementById('imgFadeInVal');
  const imgFadeOutVal = document.getElementById('imgFadeOutVal');
  
  const img = getSlideImage();
  const on = !!(img && imgState.has);
  [imgFadeInBtn, imgFadeOutBtn, imgFadeInRange, imgFadeOutRange].forEach(el => {
    if (el) el.disabled = !on;
  });
  const fi = (img?.fadeInMs) || 0, fo = (img?.fadeOutMs) || 0;
  imgFadeInBtn.classList.toggle('active', fi > 0);
  imgFadeOutBtn.classList.toggle('active', fo > 0);
  imgFadeInRange.value = fi;
  imgFadeOutRange.value = fo;
  imgFadeInVal.textContent = fmtSec(fi);
  imgFadeOutVal.textContent = fmtSec(fo);
}

// Handle image fade controls
export function handleImageFadeIn() {
  const img = getSlideImage();
  if (!img) return;
  img.fadeInMs = (img.fadeInMs || 0) > 0 ? 0 : 800;
  updateImageFadeUI();
  // Write the current slide to ensure fade settings are saved
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleImageFadeOut() {
  const img = getSlideImage();
  if (!img) return;
  img.fadeOutMs = (img.fadeOutMs || 0) > 0 ? 0 : 800;
  updateImageFadeUI();
  // Write the current slide to ensure fade settings are saved
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleImageFadeInRange(value) {
  const img = getSlideImage();
  if (!img) return;
  img.fadeInMs = parseInt(value, 10) || 0;
  const imgFadeInVal = document.getElementById('imgFadeInVal');
  imgFadeInVal.textContent = fmtSec(img.fadeInMs);
}

export function handleImageFadeOutRange(value) {
  const img = getSlideImage();
  if (!img) return;
  img.fadeOutMs = parseInt(value, 10) || 0;
  const imgFadeOutVal = document.getElementById('imgFadeOutVal');
  imgFadeOutVal.textContent = fmtSec(img.fadeOutMs);
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

export function handleImageRotate(value) {
  if (!imgState.has) return;
  const deg = parseInt(value, 10);
  imgState.angle = deg * Math.PI / 180;
  enforceImageBounds();
  setTransforms();
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleImageFlip() {
  if (!imgState.has) return;
  imgState.flip = !imgState.flip;
  setTransforms();
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
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