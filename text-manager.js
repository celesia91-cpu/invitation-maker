// text-manager.js - COMPLETE FIXED VERSION - All text management functions

import { saveProjectDebounced } from './state-manager.js';
import { generateId } from './utils.js';

// Active layer management
let activeLayer = null;
let isLocked = false;

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
    textEl.contentEditable = true;
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

    // Focus for immediate editing
    textEl.focus();

    console.log('✅ Text layer added:', text);
    
    // Save changes
    setTimeout(() => {
      saveProjectDebounced();
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
    textEl.focus();
    selectAllText(textEl);
  });

  // Text input changes
  textEl.addEventListener('input', () => {
    saveProjectDebounced();
  });

  // Blur to save changes
  textEl.addEventListener('blur', () => {
    saveProjectDebounced();
  });

  // Keyboard shortcuts
  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      textEl.blur();
      setActiveLayer(null);
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
    
    saveProjectDebounced();
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
    saveProjectDebounced();

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
  saveProjectDebounced();
  console.log('Font family applied:', fontFamily);
}

/**
 * Apply font size to active layer
 */
export function applyFontSize(fontSize) {
  if (!activeLayer) return;
  
  activeLayer.style.fontSize = fontSize + 'px';
  updateToolbarState();
  saveProjectDebounced();
  console.log('Font size applied:', fontSize);
}

/**
 * Apply color to active layer
 */
export function applyColor(color) {
  if (!activeLayer) return;
  
  activeLayer.style.color = color;
  updateToolbarState();
  saveProjectDebounced();
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
  updateToolbarState();
  saveProjectDebounced();
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
  updateToolbarState();
  saveProjectDebounced();
  console.log('Italic toggled:', newStyle);
}

/**
 * Apply text alignment
 */
export function applyTextAlign(alignment) {
  if (!activeLayer) return;
  
  activeLayer.style.textAlign = alignment;
  updateToolbarState();
  saveProjectDebounced();
  console.log('Text alignment applied:', alignment);
}

/**
 * Apply text decoration
 */
export function applyTextDecoration(decoration) {
  if (!activeLayer) return;
  
  activeLayer.style.textDecoration = decoration;
  updateToolbarState();
  saveProjectDebounced();
  console.log('Text decoration applied:', decoration);
}

/**
 * Apply text shadow
 */
export function applyTextShadow(shadow) {
  if (!activeLayer) return;
  
  activeLayer.style.textShadow = shadow;
  updateToolbarState();
  saveProjectDebounced();
  console.log('Text shadow applied:', shadow);
}

/**
 * Apply letter spacing
 */
export function applyLetterSpacing(spacing) {
  if (!activeLayer) return;
  
  activeLayer.style.letterSpacing = spacing;
  updateToolbarState();
  saveProjectDebounced();
  console.log('Letter spacing applied:', spacing);
}

/**
 * Apply line height
 */
export function applyLineHeight(height) {
  if (!activeLayer) return;
  
  activeLayer.style.lineHeight = height;
  updateToolbarState();
  saveProjectDebounced();
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

    if (fontFamilySelect) fontFamilySelect.value = 'system-ui';
    if (fontSizeInput) fontSizeInput.value = 28;
    if (fontSizeVal) fontSizeVal.textContent = '28px';
    if (colorInput) colorInput.value = '#ffffff';
    if (boldBtn) boldBtn.classList.remove('active');
    if (italicBtn) italicBtn.classList.remove('active');

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
    'boldBtn', 'italicBtn', 'deleteLayerBtn'
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

/**
 * Handle font family change
 */
export function handleFontFamilyChange(value) {
  applyFontFamily(value);
}

/**
 * Handle font size change
 */
export function handleFontSizeChange(value) {
  const fontSize = parseInt(value, 10);
  if (fontSize && fontSize > 0) {
    applyFontSize(fontSize);
    
    // Update display value
    const fontSizeVal = document.getElementById('fontSizeVal');
    if (fontSizeVal) fontSizeVal.textContent = fontSize + 'px';
  }
}

/**
 * Handle color change
 */
export function handleColorChange(value) {
  applyColor(value);
}

/**
 * Handle text alignment change
 */
export function handleTextAlignChange(alignment) {
  applyTextAlign(alignment);
}

/**
 * Setup text management event listeners
 */
export function setupTextEventListeners() {
  // Font family
  const fontFamilySelect = document.getElementById('fontFamily');
  if (fontFamilySelect) {
    fontFamilySelect.addEventListener('change', (e) => {
      handleFontFamilyChange(e.target.value);
    });
  }

  // Font size
  const fontSizeInput = document.getElementById('fontSize');
  if (fontSizeInput) {
    fontSizeInput.addEventListener('input', (e) => {
      handleFontSizeChange(e.target.value);
    });
  }

  // Color
  const colorInput = document.getElementById('fontColor');
  if (colorInput) {
    colorInput.addEventListener('change', (e) => {
      handleColorChange(e.target.value);
    });
  }

  // Bold button
  const boldBtn = document.getElementById('boldBtn');
  if (boldBtn) {
    boldBtn.addEventListener('click', toggleBold);
  }

  // Italic button
  const italicBtn = document.getElementById('italicBtn');
  if (italicBtn) {
    italicBtn.addEventListener('click', toggleItalic);
  }

  // Alignment buttons
  document.querySelectorAll('[data-align]').forEach(btn => {
    btn.addEventListener('click', () => {
      handleTextAlignChange(btn.dataset.align);
    });
  });

  // Delete layer button
  const deleteLayerBtn = document.getElementById('deleteLayerBtn');
  if (deleteLayerBtn) {
    deleteLayerBtn.addEventListener('click', deleteActiveLayer);
  }

  // Add text layer button
  const addTextBtn = document.getElementById('addTextBtn');
  if (addTextBtn) {
    addTextBtn.addEventListener('click', () => {
      addTextLayer('New Text');
    });
  }

  // Global click to deselect
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.layer') && !e.target.closest('.panel-body')) {
      setActiveLayer(null);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('.layer')) return; // Don't interfere with text editing

    if (e.key === 'Delete' && activeLayer) {
      e.preventDefault();
      deleteActiveLayer();
    } else if (e.key === 'd' && e.ctrlKey && activeLayer) {
      e.preventDefault();
      duplicateActiveLayer();
    } else if (e.key === 't' && e.ctrlKey) {
      e.preventDefault();
      addTextLayer('New Text');
    }
  });

  console.log('✅ Text event listeners setup complete');
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
  saveProjectDebounced();
}

/**
 * Initialize text manager
 */
export function initializeTextManager() {
  setupTextEventListeners();
  updateToolbarState();
  console.log('✅ Text manager initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTextManager);
} else {
  initializeTextManager();
}