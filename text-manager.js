// text-manager.js - Text layer management and styling

import { rgbToHex, isBold, fmtSec } from './utils.js';
import { saveProjectDebounced, getActiveLayer, setActiveLayer } from './state-manager.js';

// Text layer creation and management
export function addTextLayer(text) {
  const fontSizeInput = document.querySelector('#fontSize');
  const fontFamilySelect = document.querySelector('#fontFamily');
  const fontColorInput = document.querySelector('#fontColor');
  const work = document.querySelector('#work');
  const addTextInput = document.querySelector('#addText');
  const body = document.body;
  
  const t = document.createElement('div');
  t.className = 'layer';
  t.contentEditable = !(body.classList.contains('viewer'));
  t.textContent = text;
  t.style.left = '16px';
  t.style.top = '16px';
  t.style.padding = '4px 6px';
  t.style.fontWeight = '900';
  t.style.fontSize = fontSizeInput.value + 'px';
  t.style.cursor = 'move';
  t.style.fontFamily = fontFamilySelect.value;
  t.style.color = fontColorInput.value;
  t._fadeInMs = 0;
  t._fadeOutMs = 0;
  
  addLayerEventHandlers(t);
  work.appendChild(t);
  setActiveLayer(t);
  addTextInput.value = '';
  saveProjectDebounced();
}

// Add event handlers to text layers
export function addLayerEventHandlers(t) {
  t.onpointerdown = beginDragText;
  t._fadeInMs = t._fadeInMs || 0;
  t._fadeOutMs = t._fadeOutMs || 0;
  t.addEventListener('input', () => {
    saveProjectDebounced();
  });
}

// Text layer interaction state
let dragText = null;

// Begin dragging text layer
export function beginDragText(e) {
  const body = document.body;
  if (body.classList.contains('preview') || body.classList.contains('viewer')) return;
  
  setActiveLayer(e.currentTarget);
  dragText = {
    t: e.currentTarget,
    x: e.clientX,
    y: e.clientY,
    left: parseFloat(e.currentTarget.style.left || '0'),
    top: parseFloat(e.currentTarget.style.top || '0'),
    w: e.currentTarget.offsetWidth,
    h: e.currentTarget.offsetHeight
  };
  e.currentTarget.setPointerCapture?.(e.pointerId);
}

// Handle text drag movement
export function handleTextDrag(e) {
  if (!dragText) return;
  
  const work = document.querySelector('#work');
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  const r = work.getBoundingClientRect();
  const centerX = r.width / 2, centerY = r.height / 2;

  if (e.shiftKey) {
    // Resize mode
    const deltaX = e.clientX - dragText.x;
    const s = Math.max(20, dragText.w + deltaX);
    const left = parseFloat(dragText.t.style.left || '0');
    const maxW = r.width - left;
    dragText.t.style.width = Math.max(20, Math.min(s, maxW)) + 'px';
    hideGuides();
  } else {
    // Move mode
    let newLeft = dragText.left + (e.clientX - dragText.x);
    let newTop = dragText.top + (e.clientY - dragText.y);
    const w = dragText.t.offsetWidth;
    const h = dragText.t.offsetHeight;

    newLeft = Math.min(Math.max(newLeft, 0), Math.max(0, r.width - w));
    newTop = Math.min(Math.max(newTop, 0), Math.max(0, r.height - h));

    const elCx = newLeft + w / 2;
    const elCy = newTop + h / 2;
    let snapV = false, snapH = false;
    
    if (Math.abs(elCx - centerX) <= 8) {
      newLeft = Math.round(centerX - w / 2);
      snapV = true;
    }
    if (Math.abs(elCy - centerY) <= 8) {
      newTop = Math.round(centerY - h / 2);
      snapH = true;
    }

    dragText.t.style.left = newLeft + 'px';
    dragText.t.style.top = newTop + 'px';
    showGuides({ v: snapV, h: snapH });
  }
}

// End text drag
export function endTextDrag() {
  if (dragText) {
    dragText = null;
    saveProjectDebounced();
    hideGuides();
  }
}

// Guide visibility helpers
function showGuides({ v = false, h = false } = {}) {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  vGuide.style.display = v ? 'block' : 'none';
  hGuide.style.display = h ? 'block' : 'none';
}

function hideGuides() {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  vGuide.style.display = 'none';
  hGuide.style.display = 'none';
}

// Active layer management
export function updateDeleteButton() {
  const textDeleteBtn = document.querySelector('#textDelete');
  const activeLayer = getActiveLayer();
  textDeleteBtn.disabled = !activeLayer;
}

export function syncToolbarFromActive() {
  updateDeleteButton();
  const activeLayer = getActiveLayer();
  
  if (!activeLayer) {
    updateTextFadeUI();
    return;
  }
  
  const fontSizeInput = document.querySelector('#fontSize');
  const fontColorInput = document.querySelector('#fontColor');
  const fontFamilySelect = document.querySelector('#fontFamily');
  const boldBtn = document.querySelector('#boldBtn');
  const italicBtn = document.querySelector('#italicBtn');
  const underlineBtn = document.querySelector('#underlineBtn');
  
  const cs = getComputedStyle(activeLayer);
  fontSizeInput.value = parseInt(cs.fontSize, 10) || 28;
  fontColorInput.value = rgbToHex(cs.color);
  const fam = cs.fontFamily;
  const opt = [...fontFamilySelect.options].find(o => o.value.toLowerCase() === fam.toLowerCase());
  if (opt) fontFamilySelect.value = opt.value;
  
  boldBtn.classList.toggle('active', (cs.fontWeight === 'bold') || (parseInt(cs.fontWeight, 10) >= 600));
  italicBtn.classList.toggle('active', cs.fontStyle === 'italic');
  const deco = cs.textDecorationLine || cs.textDecoration || '';
  underlineBtn.classList.toggle('active', (deco + '').includes('underline'));
  updateTextFadeUI();
}

// Preserve element center during style changes
export function preserveCenterDuring(fn) {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  
  const prevW = activeLayer.offsetWidth, prevH = activeLayer.offsetHeight;
  const left = parseFloat(activeLayer.style.left || '0');
  const top = parseFloat(activeLayer.style.top || '0');
  const cx = left + prevW / 2, cy = top + prevH / 2;
  
  fn();
  
  requestAnimationFrame(() => {
    const newW = activeLayer.offsetWidth, newH = activeLayer.offsetHeight;
    activeLayer.style.left = (cx - newW / 2) + 'px';
    activeLayer.style.top = (cy - newH / 2) + 'px';
  });
}

// Text styling functions
export function handleFontSize(value) {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  
  preserveCenterDuring(() => {
    activeLayer.style.fontSize = value + 'px';
  });
  saveProjectDebounced();
}

export function handleFontColor(value) {
  const activeLayer = getActiveLayer();
  if (activeLayer) {
    activeLayer.style.color = value;
    saveProjectDebounced();
  }
}

export function handleFontFamily(value) {
  const activeLayer = getActiveLayer();
  if (activeLayer) {
    preserveCenterDuring(() => {
      activeLayer.style.fontFamily = value;
    });
    saveProjectDebounced();
  }
}

export function handleBold() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  
  preserveCenterDuring(() => {
    const cs = getComputedStyle(activeLayer);
    const on = !((cs.fontWeight === 'bold') || (parseInt(cs.fontWeight, 10) >= 600));
    activeLayer.style.fontWeight = on ? 'bold' : 'normal';
  });
  saveProjectDebounced();
}

export function handleItalic() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  
  preserveCenterDuring(() => {
    const cs = getComputedStyle(activeLayer);
    const on = cs.fontStyle !== 'italic';
    activeLayer.style.fontStyle = on ? 'italic' : 'normal';
  });
  saveProjectDebounced();
}

export function handleUnderline() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  
  const cs = getComputedStyle(activeLayer);
  const has = (cs.textDecorationLine || cs.textDecoration || '').includes('underline');
  activeLayer.style.textDecoration = has ? 'none' : 'underline';
  saveProjectDebounced();
}

// Delete active text layer
export function deleteActiveText() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  
  const work = document.querySelector('#work');
  const toRemove = activeLayer;
  const layers = [...work.querySelectorAll('.layer')];
  const idx = layers.indexOf(toRemove);
  toRemove.remove();
  const remaining = [...work.querySelectorAll('.layer')];
  const next = remaining.length ? (idx > 0 ? remaining[idx - 1] : remaining[0]) : null;
  setActiveLayer(next);
  saveProjectDebounced();
}

// Text fade UI management
export function updateTextFadeUI() {
  const textFadeInBtn = document.getElementById('textFadeInBtn');
  const textFadeOutBtn = document.getElementById('textFadeOutBtn');
  const textFadeInRange = document.getElementById('textFadeInRange');
  const textFadeOutRange = document.getElementById('textFadeOutRange');
  const textFadeInVal = document.getElementById('textFadeInVal');
  const textFadeOutVal = document.getElementById('textFadeOutVal');
  
  const activeLayer = getActiveLayer();
  const on = !!activeLayer;
  
  [textFadeInBtn, textFadeOutBtn, textFadeInRange, textFadeOutRange].forEach(el => {
    if (el) el.disabled = !on;
  });
  
  if (!on) {
    textFadeInBtn?.classList.remove('active');
    textFadeOutBtn?.classList.remove('active');
    if (textFadeInVal) textFadeInVal.textContent = '0.0s';
    if (textFadeOutVal) textFadeOutVal.textContent = '0.0s';
    return;
  }
  
  const fi = activeLayer._fadeInMs || 0, fo = activeLayer._fadeOutMs || 0;
  textFadeInBtn?.classList.toggle('active', fi > 0);
  textFadeOutBtn?.classList.toggle('active', fo > 0);
  if (textFadeInRange) textFadeInRange.value = fi;
  if (textFadeOutRange) textFadeOutRange.value = fo;
  if (textFadeInVal) textFadeInVal.textContent = fmtSec(fi);
  if (textFadeOutVal) textFadeOutVal.textContent = fmtSec(fo);
}

// Text fade handlers
export function handleTextFadeIn() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  activeLayer._fadeInMs = (activeLayer._fadeInMs || 0) > 0 ? 0 : 800;
  updateTextFadeUI();
  // Write the current slide to ensure fade settings are saved
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleTextFadeOut() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  activeLayer._fadeOutMs = (activeLayer._fadeOutMs || 0) > 0 ? 0 : 800;
  updateTextFadeUI();
  // Write the current slide to ensure fade settings are saved
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleTextFadeInRange(value) {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  activeLayer._fadeInMs = parseInt(value, 10) || 0;
  const textFadeInVal = document.getElementById('textFadeInVal');
  if (textFadeInVal) textFadeInVal.textContent = fmtSec(activeLayer._fadeInMs);
}

export function handleTextFadeOutRange(value) {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  activeLayer._fadeOutMs = parseInt(value, 10) || 0;
  const textFadeOutVal = document.getElementById('textFadeOutVal');
  if (textFadeOutVal) textFadeOutVal.textContent = fmtSec(activeLayer._fadeOutMs);
}

// Set active layer with visual feedback
export function handleSetActiveLayer(el) {
  const work = document.querySelector('#work');
  const body = document.body;
  
  setActiveLayer(el);
  [...work.querySelectorAll('.layer')].forEach(l => l.style.outline = '');
  if (el && !body.classList.contains('preview') && !body.classList.contains('viewer')) {
    el.style.outline = '2px dashed #3b82f6';
  }
  syncToolbarFromActive();
}

// Build layers data from DOM
export function buildLayersFromDOM() {
  const work = document.querySelector('#work');
  return [...work.querySelectorAll('.layer')].map(l => {
    const cs = getComputedStyle(l);
    return {
      text: l.textContent,
      left: parseFloat(l.style.left || '0'),
      top: parseFloat(l.style.top || '0'),
      width: l.style.width || null,
      fontSize: parseInt(cs.fontSize, 10) || 28,
      fontFamily: cs.fontFamily,
      color: rgbToHex(cs.color),
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      textDecoration: cs.textDecorationLine || cs.textDecoration || 'none',
      padding: l.style.padding || '4px 6px',
      fadeInMs: l._fadeInMs || 0,
      fadeOutMs: l._fadeOutMs || 0
    };
  });
}

// Load layers into DOM
export function loadLayersIntoDOM(layers) {
  const work = document.querySelector('#work');
  const body = document.body;
  const fontFamilySelect = document.querySelector('#fontFamily');
  const fontColorInput = document.querySelector('#fontColor');
  
  // Remove existing layers
  [...work.querySelectorAll('.layer')].forEach(n => n.remove());
  
  // Add new layers
  (layers || []).forEach(L => {
    const t = document.createElement('div');
    t.className = 'layer';
    t.contentEditable = !(body.classList.contains('viewer'));
    t.textContent = L.text || '';
    t.style.left = (L.left || 16) + 'px';
    t.style.top = (L.top || 16) + 'px';
    if (L.width) t.style.width = L.width;
    t.style.padding = L.padding || '4px 6px';
    t.style.fontWeight = L.fontWeight || '900';
    t.style.fontSize = (L.fontSize || 28) + 'px';
    t.style.fontStyle = L.fontStyle || 'normal';
    t.style.textDecoration = L.textDecoration || 'none';
    t.style.cursor = 'move';
    t.style.fontFamily = L.fontFamily || fontFamilySelect.value;
    t.style.color = L.color || fontColorInput.value;
    t._fadeInMs = L.fadeInMs || 0;
    t._fadeOutMs = L.fadeOutMs || 0;
    addLayerEventHandlers(t);
    work.appendChild(t);
  });
  
  // Set active layer to last one or null
  const lastLayer = [...work.querySelectorAll('.layer')].slice(-1)[0] || null;
  handleSetActiveLayer(lastLayer);
}