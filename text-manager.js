// text-manager.js - COMPLETE FIXED VERSION - All text management functions

import { saveProjectDebounced, recordHistory } from './state-manager.js';
import { generateId } from './utils.js';

// Active layer management
let activeLayer = null;
let isLocked = false;

function saveAndRecord() {
  saveProjectDebounced();
  recordHistory();
}

/**
 * Add a new text layer to the work area
 */
export async function addTextLayer(text = 'New Text', options = {}) {
  const work = document.getElementById('work');
  if (!work) {
    console.error('Work element not found');
    return null;
  }

  try {
    // Create text element
    const textEl = document.createElement('div');
    textEl.className = 'layer text-layer';
    textEl.contentEditable = 'false';
    textEl.dataset.editing = 'false';
    textEl.textContent = text;
    textEl.id = generateId('layer');

    // Apply default styles
    const defaultStyles = {
      position: 'absolute',
      left: '50px',
      top: '50px',
      fontSize: '28px',
      fontFamily: 'system-ui',
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#ffffff',
      textAlign: 'left',
      textDecoration: 'none',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
      letterSpacing: 'normal',
      lineHeight: 'normal',
      cursor: 'move',
      userSelect: 'text',
      outline: 'none',
      minWidth: '20px',
      minHeight: '20px',
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      zIndex: '30',
      ...options
    };

    // Apply styles to element
    Object.assign(textEl.style, defaultStyles);

    // Add event listeners
    setupTextLayerEvents(textEl);

    // Add to work area
    work.appendChild(textEl);

    // Set as active layer
    setActiveLayer(textEl);

    console.log('✅ Text layer added:', text);
    
    // Save changes
    setTimeout(() => {
      saveAndRecord();
    }, 100);

    return textEl;

  } catch (error) {
    console.error('Failed to add text layer:', error);
    return null;
  }
}

/**
 * Setup event listeners for text layer
 */
function setupTextLayerEvents(textEl) {
  // Click to select
  textEl.addEventListener('click', (e) => {
    e.stopPropagation();
    setActiveLayer(textEl);
  });

  // Double click to edit
  textEl.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    textEl.contentEditable = 'true';
    textEl.dataset.editing = 'true';
    textEl.style.cursor = 'text';
    textEl.focus();
    selectAllText(textEl);
  });

  // Text input changes
  textEl.addEventListener('input', () => {
    saveAndRecord();
  });

  // Blur to save changes and exit edit mode
  textEl.addEventListener('blur', () => {
    textEl.contentEditable = 'false';
    textEl.dataset.editing = 'false';
    textEl.style.cursor = 'move';
    const selection = window.getSelection?.();
    selection?.removeAllRanges();
    saveAndRecord();
  });

  // Keyboard shortcuts
  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      textEl.blur();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (textEl.textContent.trim() === '') {
        e.preventDefault();
        deleteTextLayer(textEl);
      }
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      textEl.blur();
    }
  });

  // Prevent default drag behavior
  textEl.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });
}

/**
 * Set active text layer
 */
export function setActiveLayer(layer) {
  // Remove active class from all layers
  document.querySelectorAll('.layer').forEach(l => {
    l.classList.remove('active');
  });

  // Set new active layer
  activeLayer = layer;

  if (layer) {
    layer.classList.add('active');
    syncToolbarFromActive();
    console.log('Active layer set:', layer.textContent);
  }
  updateTextFadeUI();
  updateTextZoomUI();

  // Update toolbar state
  updateToolbarState();
}

/**
 * Get currently active layer
 */
export function getActiveLayer() {
  return activeLayer;
}

/**
 * Check if editing is locked
 */
export function getLocked() {
  return isLocked;
}

/**
 * Set locked state
 */
export function setLocked(locked) {
  isLocked = locked;
  console.log('Text editing locked:', locked);
}

/**
 * Delete a text layer
 */
export function deleteTextLayer(textEl) {
  if (!textEl) return;

  try {
    if (textEl === activeLayer) {
      setActiveLayer(null);
    }

    textEl.remove();
    console.log('✅ Text layer deleted');
    
    saveAndRecord();
  } catch (error) {
    console.error('Failed to delete text layer:', error);
  }
}

/**
 * Delete active text layer
 */
export function deleteActiveLayer() {
  if (activeLayer) {
    deleteTextLayer(activeLayer);
  }
}

// Wrapper for backward compatibility with event handlers
export function deleteActiveText() {
  deleteActiveLayer();
}

/**
 * Duplicate active text layer
 */
export function duplicateActiveLayer() {
  if (!activeLayer) return;

  try {
    const newLayer = activeLayer.cloneNode(true);
    newLayer.id = generateId('layer');
    
    // Offset position slightly
    const left = parseFloat(activeLayer.style.left || '0') + 20;
    const top = parseFloat(activeLayer.style.top || '0') + 20;
    newLayer.style.left = left + 'px';
    newLayer.style.top = top + 'px';

    // Remove active class
    newLayer.classList.remove('active');

    // Setup events for new layer
    setupTextLayerEvents(newLayer);

    // Add to work area
    const work = document.getElementById('work');
    work.appendChild(newLayer);

    // Set as active
    setActiveLayer(newLayer);

    console.log('✅ Text layer duplicated');
    saveAndRecord();

  } catch (error) {
    console.error('Failed to duplicate text layer:', error);
  }
}

/**
 * Select all text in element
 */
function selectAllText(element) {
  if (window.getSelection && document.createRange) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Apply font family to active layer
 */
export function applyFontFamily(fontFamily) {
  if (!activeLayer) return;

  activeLayer.style.fontFamily = fontFamily;
  updateToolbarState();
  console.log('Font family applied:', fontFamily);
}

/**
 * Apply font size to active layer
 */
export function applyFontSize(fontSize) {
  if (!activeLayer) return;

  activeLayer.style.fontSize = fontSize + 'px';
  updateToolbarState();
  console.log('Font size applied:', fontSize);
}

/**
 * Apply color to active layer
 */
export function applyColor(color) {
  if (!activeLayer) return;

  activeLayer.style.color = color;
  updateToolbarState();
  console.log('Color applied:', color);
}

/**
 * Toggle font weight (bold)
 */
export function toggleBold() {
  if (!activeLayer) return;
  
  const currentWeight = activeLayer.style.fontWeight;
  const newWeight = (currentWeight === 'bold' || currentWeight === '700') ? 'normal' : 'bold';
  
  activeLayer.style.fontWeight = newWeight;
  console.log('Bold toggled:', newWeight);
}

/**
 * Toggle font style (italic)
 */
export function toggleItalic() {
  if (!activeLayer) return;
  
  const currentStyle = activeLayer.style.fontStyle;
  const newStyle = currentStyle === 'italic' ? 'normal' : 'italic';
  
  activeLayer.style.fontStyle = newStyle;
  console.log('Italic toggled:', newStyle);
}

/**
 * Toggle underline decoration
 */
export function toggleUnderline() {
  if (!activeLayer) return;

  const current = activeLayer.style.textDecoration;
  const newDeco = current === 'underline' ? 'none' : 'underline';

  activeLayer.style.textDecoration = newDeco;
  console.log('Underline toggled:', newDeco);
}

/**
 * Apply text alignment
 */
export function applyTextAlign(alignment) {
  if (!activeLayer) return;
  
  activeLayer.style.textAlign = alignment;
  updateToolbarState();
  saveAndRecord();
  console.log('Text alignment applied:', alignment);
}

/**
 * Apply text decoration
 */
export function applyTextDecoration(decoration) {
  if (!activeLayer) return;
  
  activeLayer.style.textDecoration = decoration;
  updateToolbarState();
  saveAndRecord();
  console.log('Text decoration applied:', decoration);
}

/**
 * Apply text shadow
 */
export function applyTextShadow(shadow) {
  if (!activeLayer) return;
  
  activeLayer.style.textShadow = shadow;
  updateToolbarState();
  saveAndRecord();
  console.log('Text shadow applied:', shadow);
}

/**
 * Apply letter spacing
 */
export function applyLetterSpacing(spacing) {
  if (!activeLayer) return;
  
  activeLayer.style.letterSpacing = spacing;
  updateToolbarState();
  saveAndRecord();
  console.log('Letter spacing applied:', spacing);
}

/**
 * Apply line height
 */
export function applyLineHeight(height) {
  if (!activeLayer) return;
  
  activeLayer.style.lineHeight = height;
  updateToolbarState();
  saveAndRecord();
  console.log('Line height applied:', height);
}

/**
 * Sync toolbar controls from active layer
 */
export function syncToolbarFromActive() {
  if (!activeLayer) {
    resetToolbar();
    return;
  }

  try {
    // Font family
    const fontFamily = activeLayer.style.fontFamily || 'system-ui';
    const fontFamilySelect = document.getElementById('fontFamily');
    if (fontFamilySelect) fontFamilySelect.value = fontFamily;

    // Font size
    const fontSize = parseFloat(activeLayer.style.fontSize) || 28;
    const fontSizeInput = document.getElementById('fontSize');
    const fontSizeVal = document.getElementById('fontSizeVal');
    if (fontSizeInput) fontSizeInput.value = fontSize;
    if (fontSizeVal) fontSizeVal.textContent = fontSize + 'px';

    // Color
    const color = activeLayer.style.color || '#ffffff';
    const colorInput = document.getElementById('fontColor');
    if (colorInput) colorInput.value = color;

    // Bold
    const isBold = activeLayer.style.fontWeight === 'bold' || activeLayer.style.fontWeight === '700';
    const boldBtn = document.getElementById('boldBtn');
    if (boldBtn) boldBtn.classList.toggle('active', isBold);

    // Italic
    const isItalic = activeLayer.style.fontStyle === 'italic';
    const italicBtn = document.getElementById('italicBtn');
    if (italicBtn) italicBtn.classList.toggle('active', isItalic);

    // Underline
    const isUnderline = activeLayer.style.textDecoration === 'underline';
    const underlineBtn = document.getElementById('underlineBtn');
    if (underlineBtn) underlineBtn.classList.toggle('active', isUnderline);

    // Text alignment
    const textAlign = activeLayer.style.textAlign || 'left';
    document.querySelectorAll('[data-align]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === textAlign);
    });

    console.log('✅ Toolbar synced from active layer');

  } catch (error) {
    console.error('Failed to sync toolbar from active layer:', error);
  }
}

/**
 * Reset toolbar to default state
 */
function resetToolbar() {
  try {
    const fontFamilySelect = document.getElementById('fontFamily');
    const fontSizeInput = document.getElementById('fontSize');
    const fontSizeVal = document.getElementById('fontSizeVal');
    const colorInput = document.getElementById('fontColor');
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');

    if (fontFamilySelect) fontFamilySelect.value = 'system-ui';
    if (fontSizeInput) fontSizeInput.value = 28;
    if (fontSizeVal) fontSizeVal.textContent = '28px';
    if (colorInput) colorInput.value = '#ffffff';
    if (boldBtn) boldBtn.classList.remove('active');
    if (italicBtn) italicBtn.classList.remove('active');
    if (underlineBtn) underlineBtn.classList.remove('active');

    document.querySelectorAll('[data-align]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === 'left');
    });

    console.log('✅ Toolbar reset');

  } catch (error) {
    console.error('Failed to reset toolbar:', error);
  }
}

/**
 * Update toolbar state based on active layer
 */
function updateToolbarState() {
  const hasActiveLayer = !!activeLayer;
  
  // Enable/disable toolbar controls
  const controls = [
    'fontFamily', 'fontSize', 'fontColor',
    'boldBtn', 'italicBtn', 'underlineBtn', 'textDelete'
  ];

  controls.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.disabled = !hasActiveLayer;
    }
  });

  // Update alignment buttons
  document.querySelectorAll('[data-align]').forEach(btn => {
    btn.disabled = !hasActiveLayer;
  });
}

// Format milliseconds as seconds string
function fmtSec(ms) {
  return (ms / 1000).toFixed(1) + 's';
}

// Update text fade timing UI
export function updateTextFadeUI() {
  const fadeInBtn = document.getElementById('textFadeInBtn');
  const fadeOutBtn = document.getElementById('textFadeOutBtn');
  const fadeInRange = document.getElementById('textFadeInRange');
  const fadeOutRange = document.getElementById('textFadeOutRange');
  const fadeInVal = document.getElementById('textFadeInVal');
  const fadeOutVal = document.getElementById('textFadeOutVal');

  const fadeIn = activeLayer?._fadeInMs || 0;
  const fadeOut = activeLayer?._fadeOutMs || 0;

  if (fadeInBtn) fadeInBtn.classList.toggle('active', fadeIn > 0);
  if (fadeOutBtn) fadeOutBtn.classList.toggle('active', fadeOut > 0);
  if (fadeInRange) fadeInRange.value = fadeIn;
  if (fadeOutRange) fadeOutRange.value = fadeOut;
  if (fadeInVal) fadeInVal.textContent = fmtSec(fadeIn);
  if (fadeOutVal) fadeOutVal.textContent = fmtSec(fadeOut);
}

// Update text zoom timing UI
export function updateTextZoomUI() {
  const zoomInBtn = document.getElementById('textZoomInBtn');
  const zoomOutBtn = document.getElementById('textZoomOutBtn');
  const zoomInRange = document.getElementById('textZoomInRange');
  const zoomOutRange = document.getElementById('textZoomOutRange');
  const zoomInVal = document.getElementById('textZoomInVal');
  const zoomOutVal = document.getElementById('textZoomOutVal');

  const zoomIn = activeLayer?._zoomInMs || 0;
  const zoomOut = activeLayer?._zoomOutMs || 0;

  if (zoomInBtn) zoomInBtn.classList.toggle('active', zoomIn > 0);
  if (zoomOutBtn) zoomOutBtn.classList.toggle('active', zoomOut > 0);
  if (zoomInRange) zoomInRange.value = zoomIn;
  if (zoomOutRange) zoomOutRange.value = zoomOut;
  if (zoomInVal) zoomInVal.textContent = fmtSec(zoomIn);
  if (zoomOutVal) zoomOutVal.textContent = fmtSec(zoomOut);
}

/**
 * Handle font family change
 */
export function handleFontFamily(value) {
  applyFontFamily(value);
  saveProjectDebounced();
}

/**
 * Handle font size change
 */
export function handleFontSize(value) {
  const fontSize = parseInt(value, 10);
  if (fontSize && fontSize > 0) {
    applyFontSize(fontSize);

    // Update display value
    const fontSizeVal = document.getElementById('fontSizeVal');
    if (fontSizeVal) fontSizeVal.textContent = fontSize + 'px';
    saveProjectDebounced();
  }
}

/**
 * Handle color change
 */
export function handleFontColor(value) {
  applyColor(value);
  saveProjectDebounced();
}

/**
 * Handle text alignment change
 */
export function handleTextAlignChange(alignment) {
  applyTextAlign(alignment);
}

/**
 * Handle bold toggle
 */
export function handleBold() {
  toggleBold();
  syncToolbarFromActive();
  saveProjectDebounced();
}

/**
 * Handle italic toggle
 */
export function handleItalic() {
  toggleItalic();
  syncToolbarFromActive();
  saveProjectDebounced();
}

/**
 * Handle underline toggle
 */
export function handleUnderline() {
  toggleUnderline();
  syncToolbarFromActive();
  saveProjectDebounced();
}

// Text fade handlers
export function handleTextFadeIn() {
  if (!activeLayer) return;
  activeLayer._fadeInMs = (activeLayer._fadeInMs || 0) > 0 ? 0 : 800;
  updateTextFadeUI();
  saveProjectDebounced();
}

export function handleTextFadeOut() {
  if (!activeLayer) return;
  activeLayer._fadeOutMs = (activeLayer._fadeOutMs || 0) > 0 ? 0 : 800;
  updateTextFadeUI();
  saveProjectDebounced();
}

export function handleTextFadeInRange(value) {
  if (!activeLayer) return;
  activeLayer._fadeInMs = parseInt(value, 10) || 0;
  updateTextFadeUI();
  saveProjectDebounced();
}

export function handleTextFadeOutRange(value) {
  if (!activeLayer) return;
  activeLayer._fadeOutMs = parseInt(value, 10) || 0;
  updateTextFadeUI();
  saveProjectDebounced();
}

// Text zoom handlers
export function handleTextZoomIn() {
  if (!activeLayer) return;
  activeLayer._zoomInMs = (activeLayer._zoomInMs || 0) > 0 ? 0 : 800;
  updateTextZoomUI();
  saveProjectDebounced();
}

export function handleTextZoomOut() {
  if (!activeLayer) return;
  activeLayer._zoomOutMs = (activeLayer._zoomOutMs || 0) > 0 ? 0 : 800;
  updateTextZoomUI();
  saveProjectDebounced();
}

export function handleTextZoomInRange(value) {
  if (!activeLayer) return;
  activeLayer._zoomInMs = parseInt(value, 10) || 0;
  updateTextZoomUI();
  saveProjectDebounced();
}

export function handleTextZoomOutRange(value) {
  if (!activeLayer) return;
  activeLayer._zoomOutMs = parseInt(value, 10) || 0;
  updateTextZoomUI();
  saveProjectDebounced();
}

/**
 * Get all text layers
 */
export function getAllTextLayers() {
  return [...document.querySelectorAll('.layer')];
}

/**
 * Clear all text layers
 */
export function clearAllTextLayers() {
  const layers = getAllTextLayers();
  layers.forEach(layer => layer.remove());
  setActiveLayer(null);
  console.log('✅ All text layers cleared');
  saveAndRecord();
}

/**
 * Initialize text manager
 */
export function initializeTextManager() {
  updateToolbarState();
  console.log('✅ Text manager initialized');
}