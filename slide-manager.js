// slide-manager.js - Fixed version with proper async handling and state synchronization

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

// Track if we're currently switching slides to prevent race conditions
let isSwitchingSlides = false;
let pendingSwitchIndex = null;

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

/* --------------------------- UI Rendering -------------------------------- */

export function updateSlidesUI() {
  ensureSlide();
  const { slidesStrip, slideLabel, slideDur, slideDurVal } = getEls();
  const slides = getSlides();
  const active = getActiveIndex();

  // Render simple strip (buttons)
  slidesStrip.innerHTML = '';
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = 'S' + (i + 1);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', i === active ? 'true' : 'false');
    b.addEventListener('click', () => setActiveSlide(i));
    if (i === active) b.classList.add('primary');
    slidesStrip.appendChild(b);
  });

  slideLabel.textContent = `Slide ${active + 1}/${slides.length}`;

  const dur = (currentSlide()?.durationMs) || DEFAULT_DUR;
  if (slideDur) slideDur.value = dur;
  if (slideDurVal) slideDurVal.textContent = fmtSec(dur);

  // Sync fade controls
  updateTextFadeUI();
  updateImageFadeUI();
}

/* --------------------------- Slide CRUD ---------------------------------- */

export async function loadSlideIntoDOM(s) {
  const { work, userBg, userBgWrap } = getEls();
  work.style.setProperty('--work-w', (s?.workSize?.w || 800) + 'px');
  work.style.setProperty('--work-h', (s?.workSize?.h || 450) + 'px');

  // Clear existing text layers
  [...work.querySelectorAll('.layer')].forEach(n => n.remove());
  
  // Reset image state first
  imgState.has = false;
  userBg.src = '';
  
  // Load layers
  loadLayersIntoDOM(s?.layers || []);

  // Apply image - wrap in Promise to handle async loading properly
  const chosenSrc = s?.image?.src || s?.image?.thumb || '';
  if (chosenSrc) {
    return new Promise((resolve) => {
      userBg.onload = () => {
        imgState.natW = userBg.naturalWidth;
        imgState.natH = userBg.naturalHeight;
        imgState.has = true;
        imgState.scale = s.image.scale ?? 1;
        imgState.angle = s.image.angle ?? 0;
        imgState.flip = !!s.image.flip;
        imgState.cx = s.image.cx ?? (work.getBoundingClientRect().width / 2);
        imgState.cy = s.image.cy ?? (work.getBoundingClientRect().height / 2);
        setTransforms();
        resolve();
      };
      userBg.onerror = () => {
        imgState.has = false;
        setTransforms();
        resolve();
      };
      userBg.src = chosenSrc;
    });
  } else {
    imgState.has = false;
    setTransforms();
    return Promise.resolve();
  }
}

// Make a small JPEG data-URL from the current <img> (kept in shared links)
function makeThumbFromImgEl(imgEl, maxW = 640, maxH = 640, quality = 0.72) {
  try {
    const src = String(imgEl?.src || '');
    if (!src.startsWith('data:')) return null; // avoid CORS on remote images
    const imW = imgEl.naturalWidth || imgEl.width;
    const imH = imgEl.naturalHeight || imgEl.height;
    if (!imW || !imH) return null;

    const r = Math.min(maxW / imW, maxH / imH, 1);
    const w = Math.max(1, Math.round(imW * r));
    const h = Math.max(1, Math.round(imH * r));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(imgEl, 0, 0, w, h);
    return c.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

// FIXED: Prevent race conditions during slide switching
export function writeCurrentSlide() {
  // Don't write while switching slides to prevent overwriting wrong slide data
  if (isSwitchingSlides) return;
  
  ensureSlide();
  const s = getSlides();
  const i = getActiveIndex();

  // Build text layers from DOM
  const layers = buildLayersFromDOM();

  // Build image object from current state
  const { userBg } = getEls();
  let image = null;
  if (imgState.has && userBg?.src) {
    image = {
      src: userBg.src,
      thumb: makeThumbFromImgEl(userBg),
      cx: imgState.cx,
      cy: imgState.cy,
      scale: imgState.scale,
      angle: imgState.angle,
      flip: !!imgState.flip,
      fadeInMs: s[i]?.image?.fadeInMs || 0,
      fadeOutMs: s[i]?.image?.fadeOutMs || 0,
    };
  }

  // Preserve duration + workSize
  const prev = s[i] || {};
  s[i] = {
    image,
    layers,
    workSize: prev.workSize || { w: 800, h: 450 },
    durationMs: prev.durationMs || DEFAULT_DUR
  };
  setSlides(s);
  saveProjectDebounced();
  updateSlidesUI();
}

export function addSlide() {
  writeCurrentSlide(); // Save current state before adding
  const s = getSlides();
  const i = getActiveIndex();
  const ns = { image: null, layers: [], workSize: { w: 800, h: 450 }, durationMs: DEFAULT_DUR };
  s.splice(i + 1, 0, ns);
  setSlides(s);
  setActiveSlide(i + 1);
}

export function duplicateSlide() {
  writeCurrentSlide(); // Save current state before duplicating
  const s = getSlides();
  const i = getActiveIndex();
  const cur = s[i];
  const copy = JSON.parse(JSON.stringify(cur));
  s.splice(i + 1, 0, copy);
  setSlides(s);
  setActiveSlide(i + 1);
}

export function deleteSlide() {
  const s = getSlides();
  const i = getActiveIndex();
  if (s.length <= 1) return;
  s.splice(i, 1);
  setSlides(s);
  setActiveSlide(Math.max(0, i - 1));
}

// FIXED: Proper async handling and race condition prevention
export async function setActiveSlide(i) {
  // If already switching and this is another request, queue it
  if (isSwitchingSlides) {
    pendingSwitchIndex = i;
    return;
  }
  
  // Prevent race conditions
  isSwitchingSlides = true;
  
  try {
    // Save current slide state before switching
    if (!getPlaying()) { // Don't save during playback
      writeCurrentSlide();
    }
    
    // Update active index
    ensureSlide(i);
    
    // Load new slide content
    await loadSlideIntoDOM(currentSlide());
    
    // Update UI
    updateSlidesUI();
    
  } finally {
    isSwitchingSlides = false;
    
    // Handle any pending switch request
    if (pendingSwitchIndex !== null && pendingSwitchIndex !== getActiveIndex()) {
      const pending = pendingSwitchIndex;
      pendingSwitchIndex = null;
      setActiveSlide(pending); // Recursive call to handle pending switch
    }
  }
}

export async function previousSlide() {
  const i = getActiveIndex();
  await setActiveSlide(Math.max(0, i - 1));
}

export async function nextSlide() {
  const s = getSlides();
  const i = getActiveIndex();
  await setActiveSlide(Math.min(s.length - 1, i + 1));
}

export function handleSlideDurationChange(value) {
  const ms = clamp(parseInt(value, 10) || DEFAULT_DUR, 500, 60000);
  const s = getSlides();
  const i = getActiveIndex();
  if (!s[i]) return;
  s[i].durationMs = ms;
  setSlides(s);
  saveProjectDebounced();
  updateSlidesUI();
}

/* --------------------------- Playback & Fades ---------------------------- */

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
    // restore CSS transition for editor UX
    userBgWrap.style.transition = '';
  }
}

async function stepFrame(ts) {
  const slides = getSlides();
  let i = getActiveIndex();
  const cur = slides[i];
  if (!cur) { stopPlay(); return; }

  // Slide time
  let start = getSlideStartTs();
  if (!start) { setSlideStartTs(ts); start = ts; }
  const t = ts - start;
  const dur = cur.durationMs || DEFAULT_DUR;

  // Apply fades
  const { work, userBgWrap } = getEls();

  // Text layers
  const domLayers = [...work.querySelectorAll('.layer')];
  domLayers.forEach((el, idx) => {
    const L = cur.layers?.[idx] || {};
    const op = computeOpacity(t, dur, L.fadeInMs || 0, L.fadeOutMs || 0);
    el.style.opacity = String(op);
  });

  // Image
  const img = cur.image || null;
  if (img && userBgWrap) {
    const op = computeOpacity(t, dur, img.fadeInMs || 0, img.fadeOutMs || 0);
    userBgWrap.style.opacity = String(op);
  }

  // Next slide?
  if (t >= dur) {
    // Move to next (loop)
    i = (i + 1) % slides.length;
    setActiveIndex(i);
    setSlideStartTs(ts);
    await loadSlideIntoDOM(slides[i]);
  }

  // Continue
  const id = requestAnimationFrame(stepFrame);
  setRafId(id);
}

function startPlay() {
  if (getPlaying()) return;
  setPlaying(true);
  const { playBtn, userBgWrap } = getEls();
  playBtn?.setAttribute('aria-pressed', 'true');
  if (playBtn) playBtn.textContent = 'Stop';
  // Disable CSS transition to let JS control fade durations precisely
  if (userBgWrap) userBgWrap.style.transition = 'opacity 0ms linear';

  setSlideStartTs(0);
  const id = requestAnimationFrame(stepFrame);
  setRafId(id);
}

function stopPlay() {
  if (!getPlaying()) return;
  setPlaying(false);
  const id = getRafId();
  if (id) cancelAnimationFrame(id);
  setRafId(0);
  const { playBtn } = getEls();
  playBtn?.setAttribute('aria-pressed', 'false');
  if (playBtn) playBtn.textContent = 'Play';
  resetOpacities();
}

export function togglePlay() {
  if (getPlaying()) stopPlay();
  else startPlay();
}

/* --------------------------- Initialization ------------------------------ */

// Ensure UI reflects current state on module import
document.addEventListener('DOMContentLoaded', () => {
  updateSlidesUI();
});