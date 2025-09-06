// text-manager.js - Enhanced text layer management with improved drag and resize

import { rgbToHex, isBold, fmtSec } from './utils.js';
import { saveProjectDebounced, getActiveLayer, setActiveLayer } from './state-manager.js';

// Enhanced text layer interaction state
let dragText = null;
let activeLayer = null;

// Text layer creation and management
export function addTextLayer(text) {
  const fontSizeInput = document.querySelector('#fontSize');
  const fontFamilySelect = document.querySelector('#fontFamily');
  const fontColorInput = document.querySelector('#fontColor');
  const work = document.querySelector('#work');
  const addTextInput = document.querySelector('#addText');
  const body = document.body;
  
  if (!work) {
    console.error('Work area not found');
    return;
  }
  
  const t = document.createElement('div');
  t.className = 'layer';
  t.contentEditable = !(body.classList.contains('viewer'));
  t.textContent = text;
  t.style.left = '16px';
  t.style.top = '16px';
  t.style.padding = '4px 6px';
  t.style.fontWeight = '900';
  t.style.fontSize = (fontSizeInput?.value || 28) + 'px';
  t.style.cursor = 'move';
  t.style.fontFamily = fontFamilySelect?.value || 'Arial';
  t.style.color = fontColorInput?.value || '#000000';
  t.style.minWidth = '20px';
  t.style.minHeight = '20px';
  t.style.wordWrap = 'break-word';
  t.style.overflowWrap = 'break-word';
  
  // Animation properties
  t._fadeInMs = 0;
  t._fadeOutMs = 0;
  t._zoomInMs = 0;
  t._zoomOutMs = 0;
  
  addLayerEventHandlers(t);
  work.appendChild(t);
  handleSetActiveLayer(t);
  
  if (addTextInput) addTextInput.value = '';
  saveProjectDebounced();
  
  console.log('📝 Added new text layer:', text);
}

// Add event handlers to text layers
export function addLayerEventHandlers(t) {
  if (!t) return;
  
  // Enhanced pointer event handling
  t.onpointerdown = beginDragText;
  
  // Initialize animation properties
  t._fadeInMs = t._fadeInMs || 0;
  t._fadeOutMs = t._fadeOutMs || 0;
  t._zoomInMs = t._zoomInMs || 0;
  t._zoomOutMs = t._zoomOutMs || 0;
  
  // Input event for content changes
  t.addEventListener('input', () => {
    saveProjectDebounced();
  });
  
  // Click handler for selection
  t.addEventListener('click', (e) => {
    if (!isTextDragging()) {
      e.stopPropagation();
      handleSetActiveLayer(t);
    }
  });
  
  // Focus/blur handlers
  t.addEventListener('focus', () => {
    if (!isTextDragging()) {
      handleSetActiveLayer(t);
    }
  });
}

/**
 * Begin dragging text layer - Enhanced version
 * FIXES: Better bounds checking, improved resize mode detection, safer pointer handling
 */
export function beginDragText(e) {
  const body = document.body;
  if (body.classList.contains('preview') || body.classList.contains('viewer')) return;
  
  // End any existing drag first
  if (dragText) {
    endTextDrag();
  }
  
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
  
  // Safe pointer capture
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId);
  } catch (error) {
    // Ignore capture errors
  }
}

/**
 * Handle text drag movement with improved resize logic
 * FIXES: Better boundary constraints, smoother resize, aspect ratio options
 */
export function handleTextDrag(e) {
  if (!dragText) return;
  
  const work = document.querySelector('#work');
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  
  if (!work) return;
  
  const r = work.getBoundingClientRect();
  const centerX = r.width / 2, centerY = r.height / 2;

  if (e.shiftKey) {
    // Resize mode - Fixed boundary checking
    const deltaX = e.clientX - dragText.x;
    const newWidth = Math.max(20, dragText.w + deltaX);
    const left = parseFloat(dragText.t.style.left || '0');
    const maxW = Math.max(20, r.width - left - 10); // 10px margin
    
    dragText.t.style.width = Math.min(newWidth, maxW) + 'px';
    hideGuides();
  } else {
    // Move mode - Fixed boundary checking
    let newLeft = dragText.left + (e.clientX - dragText.x);
    let newTop = dragText.top + (e.clientY - dragText.y);
    const w = dragText.t.offsetWidth;
    const h = dragText.t.offsetHeight;

    // Better boundary constraints
    newLeft = Math.max(0, Math.min(newLeft, Math.max(0, r.width - w)));
    newTop = Math.max(0, Math.min(newTop, Math.max(0, r.height - h)));

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

/**
 * Handle text resizing with better constraints
 */
function handleTextResize(e, workRect, centerX, centerY) {
  const deltaX = e.clientX - dragText.x;
  const deltaY = e.clientY - dragText.y;
  
  // Calculate new width based on horizontal movement
  const newWidth = Math.max(20, dragText.w + deltaX);
  
  // Get current position
  const currentLeft = parseFloat(dragText.t.style.left || '0');
  const currentTop = parseFloat(dragText.t.style.top || '0');
  
  // Calculate maximum allowed width (can't exceed work area)
  const maxWidth = Math.max(20, workRect.width - currentLeft - 10); // 10px margin
  
  // Apply width constraints
  const constrainedWidth = Math.max(20, Math.min(newWidth, maxWidth));
  
  // For proportional resize (hold Alt key), also adjust height
  if (e.altKey && dragText.h > 0) {
    const aspectRatio = dragText.w / dragText.h;
    const newHeight = constrainedWidth / aspectRatio;
    const maxHeight = Math.max(20, workRect.height - currentTop - 10);
    const constrainedHeight = Math.max(20, Math.min(newHeight, maxHeight));
    
    dragText.t.style.height = constrainedHeight + 'px';
  }
  
  // Apply the new width
  dragText.t.style.width = constrainedWidth + 'px';
  
  // Hide guides during resize
  hideGuides();
  
  console.log('🔄 Resizing text:', { 
    width: constrainedWidth, 
    maxWidth, 
    proportional: e.altKey 
  });
}

/**
 * Handle text movement with improved snapping
 */
function handleTextMove(e, workRect, centerX, centerY, vGuide, hGuide) {
  // Calculate new position
  let newLeft = dragText.left + (e.clientX - dragText.x);
  let newTop = dragText.top + (e.clientY - dragText.y);
  
  // Get current element dimensions (they might have changed)
  const currentWidth = dragText.t.offsetWidth;
  const currentHeight = dragText.t.offsetHeight;
  
  // Boundary constraints with margins
  const margin = 5;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = Math.max(margin, workRect.width - currentWidth - margin);
  const maxTop = Math.max(margin, workRect.height - currentHeight - margin);
  
  // Apply boundary constraints
  newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
  newTop = Math.max(minTop, Math.min(newTop, maxTop));
  
  // Calculate element center for snapping
  const elementCenterX = newLeft + currentWidth / 2;
  const elementCenterY = newTop + currentHeight / 2;
  
  // Snap to center guides (configurable snap distance)
  const snapDistance = 12; // Increased for easier snapping
  let snapV = false;
  let snapH = false;
  
  // Vertical center snap
  if (Math.abs(elementCenterX - centerX) <= snapDistance) {
    newLeft = Math.round(centerX - currentWidth / 2);
    snapV = true;
  }
  
  // Horizontal center snap
  if (Math.abs(elementCenterY - centerY) <= snapDistance) {
    newTop = Math.round(centerY - currentHeight / 2);
    snapH = true;
  }
  
  // Additional snapping to other elements
  const snapToElements = snapToOtherElements(newLeft, newTop, currentWidth, currentHeight, snapDistance);
  if (snapToElements.snapped) {
    newLeft = snapToElements.left;
    newTop = snapToElements.top;
    snapV = snapToElements.snapV || snapV;
    snapH = snapToElements.snapH || snapH;
  }
  
  // Apply the new position
  dragText.t.style.left = newLeft + 'px';
  dragText.t.style.top = newTop + 'px';
  
  // Show/hide guides
  showGuides({ v: snapV, h: snapH });
  
  console.log('🔄 Moving text:', { 
    position: { left: newLeft, top: newTop },
    snapped: { v: snapV, h: snapH }
  });
}

/**
 * Snap to other text elements for better alignment
 */
function snapToOtherElements(newLeft, newTop, width, height, snapDistance) {
  const result = {
    left: newLeft,
    top: newTop,
    snapV: false,
    snapH: false,
    snapped: false
  };

  // Get all other text layers
  const allLayers = document.querySelectorAll('.layer');
  const currentLayer = dragText.t;
  
  for (const layer of allLayers) {
    if (layer === currentLayer) continue;
    
    const otherRect = layer.getBoundingClientRect();
    const work = document.querySelector('#work');
    const workRect = work.getBoundingClientRect();
    
    const otherLeft = otherRect.left - workRect.left;
    const otherTop = otherRect.top - workRect.top;
    const otherWidth = layer.offsetWidth;
    const otherHeight = layer.offsetHeight;
    
    // Snap to left edge
    if (Math.abs(newLeft - otherLeft) <= snapDistance) {
      result.left = otherLeft;
      result.snapV = true;
      result.snapped = true;
    }
    
    // Snap to right edge
    else if (Math.abs((newLeft + width) - (otherLeft + otherWidth)) <= snapDistance) {
      result.left = otherLeft + otherWidth - width;
      result.snapV = true;
      result.snapped = true;
    }
    
    // Snap to top edge
    if (Math.abs(newTop - otherTop) <= snapDistance) {
      result.top = otherTop;
      result.snapH = true;
      result.snapped = true;
    }
    
    // Snap to bottom edge
    else if (Math.abs((newTop + height) - (otherTop + otherHeight)) <= snapDistance) {
      result.top = otherTop + otherHeight - height;
      result.snapH = true;
      result.snapped = true;
    }
  }
  
  return result;
}

/**
 * End text drag with improved cleanup
 */
export function endTextDrag() {
  if (dragText) {
    console.log('✅ Ending text drag');
    
    try {
      // Remove visual classes
      if (dragText.t) {
        dragText.t.classList.remove('dragging', 'resizing');
      }
      
      // Save the project state only if moved
      if (dragText.hasMoved) {
        saveProjectDebounced();
      }
      
      // Clean up
      dragText = null;
      hideGuides();
      
    } catch (error) {
      console.error('Error ending text drag:', error);
      // Still clean up even if save fails
      dragText = null;
      hideGuides();
    }
  }
}

// Guide visibility helpers - improved performance
function showGuides({ v = false, h = false } = {}) {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  
  if (vGuide) {
    vGuide.style.display = v ? 'block' : 'none';
    if (v) vGuide.classList.add('visible');
    else vGuide.classList.remove('visible');
  }
  if (hGuide) {
    hGuide.style.display = h ? 'block' : 'none';
    if (h) hGuide.classList.add('visible');
    else hGuide.classList.remove('visible');
  }
}

function hideGuides() {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  
  if (vGuide) {
    vGuide.style.display = 'none';
    vGuide.classList.remove('visible');
  }
  if (hGuide) {
    hGuide.style.display = 'none';
    hGuide.classList.remove('visible');
  }
}

/**
 * Check if currently dragging text
 */
export function isTextDragging() {
  return !!dragText;
}

/**
 * Get current drag state (for debugging)
 */
export function getTextDragState() {
  return dragText ? {
    elementId: dragText.t.dataset.id,
    isResizing: dragText.isResizing,
    position: { left: dragText.left, top: dragText.top },
    dimensions: { width: dragText.w, height: dragText.h },
    hasMoved: dragText.hasMoved
  } : null;
}

/**
 * Force cleanup for emergency situations
 */
export function forceEndTextDrag() {
  dragText = null;
  hideGuides();
}

// Active layer management
export function updateDeleteButton() {
  const textDeleteBtn = document.querySelector('#textDelete');
  const activeLayer = getActiveLayer();
  if (textDeleteBtn) {
    textDeleteBtn.disabled = !activeLayer;
  }
}

export function syncToolbarFromActive() {
  updateDeleteButton();
  const activeLayer = getActiveLayer();

  if (!activeLayer) {
    updateTextFadeUI();
    updateTextZoomUI();
    return;
  }
  
  const fontSizeInput = document.querySelector('#fontSize');
  const fontColorInput = document.querySelector('#fontColor');
  const fontFamilySelect = document.querySelector('#fontFamily');
  const boldBtn = document.querySelector('#boldBtn');
  const italicBtn = document.querySelector('#italicBtn');
  const underlineBtn = document.querySelector('#underlineBtn');
  
  try {
    const cs = getComputedStyle(activeLayer);
    
    if (fontSizeInput) {
      fontSizeInput.value = parseInt(cs.fontSize, 10) || 28;
    }
    if (fontColorInput) {
      fontColorInput.value = rgbToHex(cs.color);
    }
    if (fontFamilySelect) {
      const fam = cs.fontFamily;
      const opt = [...fontFamilySelect.options].find(o => o.value.toLowerCase() === fam.toLowerCase());
      if (opt) fontFamilySelect.value = opt.value;
    }
    
    if (boldBtn) {
      boldBtn.classList.toggle('active', (cs.fontWeight === 'bold') || (parseInt(cs.fontWeight, 10) >= 600));
    }
    if (italicBtn) {
      italicBtn.classList.toggle('active', cs.fontStyle === 'italic');
    }
    if (underlineBtn) {
      const deco = cs.textDecorationLine || cs.textDecoration || '';
      underlineBtn.classList.toggle('active', (deco + '').includes('underline'));
    }
  } catch (error) {
    console.error('Error syncing toolbar:', error);
  }
  
  updateTextFadeUI();
  updateTextZoomUI();
}

// Preserve element center during style changes
export function preserveCenterDuring(fn) {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  
  try {
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
  } catch (error) {
    console.error('Error preserving center:', error);
    fn(); // Still execute the function
  }
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
  
  try {
    const work = document.querySelector('#work');
    const toRemove = activeLayer;
    const layers = [...work.querySelectorAll('.layer')];
    const idx = layers.indexOf(toRemove);
    
    toRemove.remove();
    
    const remaining = [...work.querySelectorAll('.layer')];
    const next = remaining.length ? (idx > 0 ? remaining[idx - 1] : remaining[0]) : null;
    
    handleSetActiveLayer(next);
    saveProjectDebounced();
    
    console.log('🗑️ Deleted text layer');
  } catch (error) {
    console.error('Error deleting text layer:', error);
  }
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

// Text zoom UI management
export function updateTextZoomUI() {
  const textZoomInBtn = document.getElementById('textZoomInBtn');
  const textZoomOutBtn = document.getElementById('textZoomOutBtn');
  const textZoomInRange = document.getElementById('textZoomInRange');
  const textZoomOutRange = document.getElementById('textZoomOutRange');
  const textZoomInVal = document.getElementById('textZoomInVal');
  const textZoomOutVal = document.getElementById('textZoomOutVal');

  const activeLayer = getActiveLayer();
  const on = !!activeLayer;

  [textZoomInBtn, textZoomOutBtn, textZoomInRange, textZoomOutRange].forEach(el => {
    if (el) el.disabled = !on;
  });

  if (!on) {
    textZoomInBtn?.classList.remove('active');
    textZoomOutBtn?.classList.remove('active');
    if (textZoomInVal) textZoomInVal.textContent = '0.0s';
    if (textZoomOutVal) textZoomOutVal.textContent = '0.0s';
    return;
  }

  const zi = activeLayer._zoomInMs || 0, zo = activeLayer._zoomOutMs || 0;
  textZoomInBtn?.classList.toggle('active', zi > 0);
  textZoomOutBtn?.classList.toggle('active', zo > 0);
  if (textZoomInRange) textZoomInRange.value = zi;
  if (textZoomOutRange) textZoomOutRange.value = zo;
  if (textZoomInVal) textZoomInVal.textContent = fmtSec(zi);
  if (textZoomOutVal) textZoomOutVal.textContent = fmtSec(zo);
}

// Text zoom handlers
export function handleTextZoomIn() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  activeLayer._zoomInMs = (activeLayer._zoomInMs || 0) > 0 ? 0 : 800;
  updateTextZoomUI();
  // Write the current slide to ensure zoom settings are saved
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleTextZoomOut() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  activeLayer._zoomOutMs = (activeLayer._zoomOutMs || 0) > 0 ? 0 : 800;
  updateTextZoomUI();
  // Write the current slide to ensure zoom settings are saved
  import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
  saveProjectDebounced();
}

export function handleTextZoomInRange(value) {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  activeLayer._zoomInMs = parseInt(value, 10) || 0;
  const textZoomInVal = document.getElementById('textZoomInVal');
  if (textZoomInVal) textZoomInVal.textContent = fmtSec(activeLayer._zoomInMs);
}

export function handleTextZoomOutRange(value) {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;
  activeLayer._zoomOutMs = parseInt(value, 10) || 0;
  const textZoomOutVal = document.getElementById('textZoomOutVal');
  if (textZoomOutVal) textZoomOutVal.textContent = fmtSec(activeLayer._zoomOutMs);
}

/**
 * Set active layer with enhanced visual feedback
 */
export function handleSetActiveLayer(el) {
  const work = document.querySelector('#work');
  const body = document.body;
  
  if (!work) {
    console.error('Work area not found');
    return;
  }
  
  // Update global state
  setActiveLayer(el);
  activeLayer = el;
  
  // Clear previous active states
  [...work.querySelectorAll('.layer')].forEach(l => {
    l.style.outline = '';
    l.classList.remove('active');
  });
  
  // Set new active state
  if (el && !body.classList.contains('preview') && !body.classList.contains('viewer')) {
    el.style.outline = '2px dashed #3b82f6';
    el.classList.add('active');
    
    // Dispatch custom event for other components
    const event = new CustomEvent('layerActivated', { 
      detail: { layer: el, id: el.dataset.id } 
    });
    document.dispatchEvent(event);
    
    console.log('📝 Active layer set:', el.textContent.substring(0, 20));
  }
  
  syncToolbarFromActive();
}

/**
 * Get the currently active layer
 */
export function getActiveTextLayer() {
  return activeLayer || getActiveLayer();
}

/**
 * Add keyboard shortcuts for text manipulation
 */
export function setupTextKeyboardShortcuts() {
  // Prevent multiple event listeners
  if (window._textKeyboardSetup) return;
  window._textKeyboardSetup = true;
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && dragText) {
      endTextDrag();
    }
  });
}

/**
 * Move layer with keyboard arrows
 */
function moveLayerWithKeyboard(e) {
  const activeLayer = getActiveLayer();
  if (!activeLayer || isTextDragging()) return;
  
  e.preventDefault();
  
  const step = e.shiftKey ? 10 : 1; // Larger steps with shift
  const currentLeft = parseFloat(activeLayer.style.left || '0');
  const currentTop = parseFloat(activeLayer.style.top || '0');
  
  let newLeft = currentLeft;
  let newTop = currentTop;
  
  switch (e.key) {
    case 'ArrowLeft':
      newLeft = Math.max(0, currentLeft - step);
      break;
    case 'ArrowRight':
      newLeft = currentLeft + step;
      break;
    case 'ArrowUp':
      newTop = Math.max(0, currentTop - step);
      break;
    case 'ArrowDown':
      newTop = currentTop + step;
      break;
  }
  
  // Apply bounds checking
  const work = document.querySelector('#work');
  if (work) {
    const workRect = work.getBoundingClientRect();
    const layerWidth = activeLayer.offsetWidth;
    const layerHeight = activeLayer.offsetHeight;
    
    newLeft = Math.max(0, Math.min(newLeft, workRect.width - layerWidth));
    newTop = Math.max(0, Math.min(newTop, workRect.height - layerHeight));
  }
  
  // Apply new position
  activeLayer.style.left = newLeft + 'px';
  activeLayer.style.top = newTop + 'px';
  
  // Save changes
  try {
    saveProjectDebounced();
  } catch (error) {
    console.warn('Failed to save after keyboard move:', error);
  }
  
  console.log('⌨️ Moved layer with keyboard:', { left: newLeft, top: newTop });
}

// Build layers data from DOM
export function buildLayersFromDOM() {
  const work = document.querySelector('#work');
  if (!work) return [];
  
  return [...work.querySelectorAll('.layer')].map(l => {
    try {
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
        fadeOutMs: l._fadeOutMs || 0,
        zoomInMs: l._zoomInMs || 0,
        zoomOutMs: l._zoomOutMs || 0
      };
    } catch (error) {
      console.error('Error building layer data:', error);
      return null;
    }
  }).filter(Boolean);
}

// Load layers into DOM
export function loadLayersIntoDOM(layers) {
  const work = document.querySelector('#work');
  const body = document.body;
  const fontFamilySelect = document.querySelector('#fontFamily');
  const fontColorInput = document.querySelector('#fontColor');
  
  if (!work) {
    console.error('Work area not found');
    return;
  }
  
  try {
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
      t.style.fontFamily = L.fontFamily || fontFamilySelect?.value || 'Arial';
      t.style.color = L.color || fontColorInput?.value || '#000000';
      t.style.minWidth = '20px';
      t.style.minHeight = '20px';
      t.style.wordWrap = 'break-word';
      t.style.overflowWrap = 'break-word';
      
      // Animation properties
      t._fadeInMs = L.fadeInMs || 0;
      t._fadeOutMs = L.fadeOutMs || 0;
      t._zoomInMs = L.zoomInMs || 0;
      t._zoomOutMs = L.zoomOutMs || 0;
      
      addLayerEventHandlers(t);
      work.appendChild(t);
    });
    
    // Set active layer to last one or null
    const lastLayer = [...work.querySelectorAll('.layer')].slice(-1)[0] || null;
    handleSetActiveLayer(lastLayer);
    
    console.log(`📝 Loaded ${layers?.length || 0} text layers`);
  } catch (error) {
    console.error('Error loading layers:', error);
  }
}

// Initialize keyboard shortcuts when module loads
setTimeout(() => {
  setupTextKeyboardShortcuts();
}, 100);

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
      fadeOutMs: l._fadeOutMs || 0,
      zoomInMs: l._zoomInMs || 0,
      zoomOutMs: l._zoomOutMs || 0
    };
  });
}