// text-manager.js - Fixed version with improved resize handling

let dragText = null;
let activeLayer = null;

/**
 * Begin dragging a text element
 * FIXES: Better bounds checking, improved resize mode detection, safer pointer handling
 */
export function beginDragText(e) {
  const t = e.target.closest('.layer');
  if (!t) return false;

  // Prevent multiple simultaneous drags
  if (dragText) {
    endTextDrag();
  }

  try {
    e.preventDefault();
    e.stopPropagation();

    const work = document.querySelector('#work');
    if (!work) {
      console.error('Work area not found');
      return false;
    }

    const workRect = work.getBoundingClientRect();
    const layerRect = t.getBoundingClientRect();

    // Calculate relative positions more accurately
    const left = layerRect.left - workRect.left;
    const top = layerRect.top - workRect.top;

    dragText = {
      t: t,
      x: e.clientX,
      y: e.clientY,
      left: left,
      top: top,
      w: t.offsetWidth,
      h: t.offsetHeight,
      isResizing: e.shiftKey, // Track initial resize state
      workRect: workRect // Cache work bounds
    };

    // Set the active layer
    handleSetActiveLayer(t);
    
    console.log('📝 Text drag started', { 
      isResizing: dragText.isResizing,
      dimensions: { w: dragText.w, h: dragText.h },
      position: { left: dragText.left, top: dragText.top }
    });

    return true;

  } catch (error) {
    console.error('Failed to begin text drag:', error);
    dragText = null;
    return false;
  }
}

/**
 * Handle text drag movement with improved resize logic
 * FIXES: Better boundary constraints, smoother resize, aspect ratio options
 */
export function handleTextDrag(e) {
  if (!dragText) return;

  try {
    const work = document.querySelector('#work');
    const vGuide = document.getElementById('vGuide');
    const hGuide = document.getElementById('hGuide');
    
    if (!work) {
      console.error('Work area not found during drag');
      return;
    }

    const workRect = work.getBoundingClientRect();
    const centerX = workRect.width / 2;
    const centerY = workRect.height / 2;

    // Check if we're in resize mode (shift key or initially started with shift)
    const isResizing = e.shiftKey || dragText.isResizing;

    if (isResizing) {
      // RESIZE MODE - Improved resize handling
      handleTextResize(e, workRect, centerX, centerY);
    } else {
      // MOVE MODE - Improved movement with better snapping
      handleTextMove(e, workRect, centerX, centerY, vGuide, hGuide);
    }

  } catch (error) {
    console.error('Error during text drag:', error);
    endTextDrag(); // Clean up on error
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
  
  // Additional snapping to other elements (optional)
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
      // Save the project state
      const { saveProjectDebounced } = import('./state-manager.js');
      saveProjectDebounced?.();
      
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

/**
 * Set active layer with better visual feedback
 */
export function handleSetActiveLayer(layer) {
  // Remove previous active state
  const prevActive = document.querySelector('.layer.active');
  if (prevActive) {
    prevActive.classList.remove('active');
  }
  
  // Set new active layer
  if (layer) {
    layer.classList.add('active');
    activeLayer = layer;
    
    // Dispatch custom event for other components
    const event = new CustomEvent('layerActivated', { 
      detail: { layer, id: layer.dataset.id } 
    });
    document.dispatchEvent(event);
    
    console.log('📝 Active layer set:', layer.dataset.id);
  } else {
    activeLayer = null;
  }
}

/**
 * Get the currently active layer
 */
export function getActiveLayer() {
  return activeLayer;
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
    dimensions: { width: dragText.w, height: dragText.h }
  } : null;
}

/**
 * Guide visibility helpers - improved performance
 */
function showGuides({ v = false, h = false } = {}) {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  
  if (vGuide) {
    vGuide.style.display = v ? 'block' : 'none';
  }
  if (hGuide) {
    hGuide.style.display = h ? 'block' : 'none';
  }
}

function hideGuides() {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  
  if (vGuide) vGuide.style.display = 'none';
  if (hGuide) hGuide.style.display = 'none';
}

/**
 * Force cleanup for emergency situations
 */
export function forceEndTextDrag() {
  console.log('🛑 Force ending text drag');
  dragText = null;
  hideGuides();
  
  // Remove any stuck active states
  const activeElements = document.querySelectorAll('.layer.active');
  activeElements.forEach(el => el.classList.remove('active'));
}

/**
 * Add keyboard shortcuts for text manipulation
 */
export function setupTextKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (!activeLayer) return;
    
    // Delete key to remove layer
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (confirm('Delete this text layer?')) {
        removeTextLayer(activeLayer);
      }
      e.preventDefault();
    }
    
    // Arrow keys for precise movement
    if (e.key.startsWith('Arrow')) {
      moveLayerWithKeyboard(e);
    }
    
    // Escape to deselect
    if (e.key === 'Escape') {
      handleSetActiveLayer(null);
    }
  });
}

/**
 * Move layer with keyboard arrows
 */
function moveLayerWithKeyboard(e) {
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
    const { saveProjectDebounced } = import('./state-manager.js');
    saveProjectDebounced?.();
  } catch (error) {
    console.warn('Failed to save after keyboard move:', error);
  }
}

/**
 * Remove a text layer
 */
function removeTextLayer(layer) {
  try {
    if (layer === activeLayer) {
      activeLayer = null;
    }
    
    layer.remove();
    
    // Dispatch removal event
    const event = new CustomEvent('layerRemoved', { 
      detail: { id: layer.dataset.id } 
    });
    document.dispatchEvent(event);
    
    // Save changes
    const { saveProjectDebounced } = import('./state-manager.js');
    saveProjectDebounced?.();
    
    console.log('🗑️ Text layer removed');
    
  } catch (error) {
    console.error('Failed to remove text layer:', error);
  }
}