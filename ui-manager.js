// ui-manager.js - FIXED RSVP Bar Visibility in Viewer Mode

// UI state management
let sidebarOpen = false;
let previewMode = false;

// Export main functions
export function togglePanel() {
  if (sidebarOpen) {
    closePanel();
  } else {
    openPanel();
  }
}

export function openPanel() {
  document.body.classList.add('panel-open');
  sidebarOpen = true;
  syncTopbarHeight();
}

export function closePanel() {
  document.body.classList.remove('panel-open');
  sidebarOpen = false;
  syncTopbarHeight();
}

export function togglePreview() {
  if (previewMode) {
    exitPreview();
  } else {
    enterPreview();
  }
}

export function enterPreview() {
  document.body.classList.add('preview');
  previewMode = true;
  
  // Ensure RSVP bar is visible in preview mode
  ensureRsvpVisibility();
}

export function exitPreview() {
  document.body.classList.remove('preview');
  previewMode = false;
}

// Top bar height synchronization
export function syncTopbarHeight() {
  const topbar = document.getElementById('topbar');
  if (topbar) {
    const height = topbar.offsetHeight;
    document.documentElement.style.setProperty('--topbar-height', `${height}px`);
  }
}

// Mobile topbar collapse
export function setMobileTopbarCollapsed(collapsed) {
  const body = document.body;
  const toggleBtn = document.getElementById('togglePanelBtn');
  
  if (collapsed) {
    body.classList.add('mobile-topbar-collapsed');
    if (toggleBtn) toggleBtn.style.display = 'none';
  } else {
    body.classList.remove('mobile-topbar-collapsed');
    if (toggleBtn) toggleBtn.style.display = '';
  }
}

// Guide management
export function showGuides(x, y, w, h) {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  
  if (vGuide) vGuide.style.display = x !== undefined ? 'block' : 'none';
  if (hGuide) hGuide.style.display = h !== undefined ? 'block' : 'none';
}

export function hideGuides() {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  if (vGuide) vGuide.style.display = 'none';
  if (hGuide) hGuide.style.display = 'none';
}

// Event handlers setup
export function setupUIEventHandlers() {
  const togglePanelBtn = document.getElementById('togglePanelBtn');
  const previewBtn = document.getElementById('previewBtn');
  const backdrop = document.getElementById('backdrop');
  
  togglePanelBtn?.addEventListener('click', togglePanel);
  previewBtn?.addEventListener('click', togglePreview);
  backdrop?.addEventListener('click', closePanel);
  
  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const body = document.body;
      if (body.classList.contains('preview')) {
        exitPreview();
      } else {
        closePanel();
      }
    }
  });
}

// Initialize UI for different modes
export function initializeForMode() {
  const body = document.body;
  
  syncTopbarHeight();
  
  // Import state manager to check if viewer mode
  import('./state-manager.js').then(({ getIsViewer }) => {
    const isViewer = getIsViewer();
    
    if (!isViewer) {
      const isDesktop = window.matchMedia('(min-width: 960px)').matches;
      if (isDesktop) {
        openPanel();
      } else {
        closePanel();
      }
    } else {
      closePanel();
      // Setup viewer mode with RSVP bar
      setupViewerMode();
    }
  }).catch((error) => {
    console.warn('Could not import state manager, using fallback:', error);
    // Fallback: check if body has viewer class
    if (body.classList.contains('viewer')) {
      setupViewerMode();
    }
  });
  
  setMobileTopbarCollapsed(false);
}

// FIXED: Complete viewer mode setup
function setupViewerMode() {
  console.log('Setting up viewer mode...');
  
  const body = document.body;
  body.classList.add('viewer');
  
  // Setup RSVP bar for viewer mode
  setupViewerRsvp();
  
  // Ensure RSVP handlers are properly initialized
  initializeRsvpHandlers();
  
  // Hide unnecessary UI elements in viewer mode
  hideViewerUnnecessaryElements();
  
  console.log('Viewer mode setup complete');
}

// FIXED: Enhanced RSVP setup for viewer mode
function setupViewerRsvp() {
  const rsvpBar = document.getElementById('rsvpBar');
  
  if (!rsvpBar) {
    console.warn('RSVP bar element not found');
    return;
  }

  // Remove any existing inline styles that might interfere
  rsvpBar.removeAttribute('style');
  
  // Apply viewer mode styles
  Object.assign(rsvpBar.style, {
    display: 'flex',
    position: 'fixed',
    bottom: 'max(12px, env(safe-area-inset-bottom))',
    left: 'max(12px, env(safe-area-inset-left))', 
    right: 'max(12px, env(safe-area-inset-right))',
    zIndex: '1200',
    pointerEvents: 'auto',
    visibility: 'visible',
    opacity: '1',
    transform: 'none' // Reset any transforms
  });
  
  // Add viewer class for CSS targeting
  rsvpBar.classList.add('viewer-mode');
  
  console.log('RSVP bar configured for viewer mode');
}

// FIXED: Initialize RSVP handlers with error handling
function initializeRsvpHandlers() {
  const rsvpButtons = document.querySelectorAll('.rsvp-btn');
  
  if (rsvpButtons.length === 0) {
    console.warn('No RSVP buttons found');
    return;
  }
  
  rsvpButtons.forEach(button => {
    if (!button.hasAttribute('data-rsvp-initialized')) {
      button.addEventListener('click', handleRsvpClick);
      button.setAttribute('data-rsvp-initialized', 'true');
    }
  });
  
  console.log(`Initialized ${rsvpButtons.length} RSVP buttons`);
}

// RSVP click handler
function handleRsvpClick(event) {
  const button = event.target;
  const response = button.dataset.response;
  
  if (!response) {
    console.error('RSVP button missing data-response attribute');
    return;
  }
  
  // Update button states
  updateRsvpButtonStates(response);
  
  // Trigger RSVP submission if state manager is available
  if (window.stateManager && typeof window.stateManager.setRsvpChoice === 'function') {
    window.stateManager.setRsvpChoice(response);
  }
  
  console.log('RSVP response:', response);
}

// Update RSVP button visual states
function updateRsvpButtonStates(activeResponse) {
  const rsvpButtons = document.querySelectorAll('.rsvp-btn');
  
  rsvpButtons.forEach(button => {
    const response = button.dataset.response;
    button.classList.toggle('active', response === activeResponse);
    button.classList.toggle('confirmed', response === activeResponse);
  });
}

// Hide unnecessary elements in viewer mode
function hideViewerUnnecessaryElements() {
  const elementsToHide = [
    '#sidebar',
    '#togglePanelBtn', 
    '#previewBtn',
    '.editor-only',
    '.admin-only'
  ];
  
  elementsToHide.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = 'none';
    }
  });
}

// ENHANCED: Ensure RSVP visibility with retry mechanism
function ensureRsvpVisibility(retries = 3) {
  const rsvpBar = document.getElementById('rsvpBar');
  
  if (!rsvpBar) {
    if (retries > 0) {
      console.log(`RSVP bar not found, retrying... (${retries} attempts left)`);
      setTimeout(() => ensureRsvpVisibility(retries - 1), 100);
    } else {
      console.error('RSVP bar element not found after retries');
    }
    return;
  }
  
  const body = document.body;
  const isViewer = body.classList.contains('viewer');
  const isPreview = body.classList.contains('preview');
  
  if (isViewer || isPreview) {
    // Force visibility in viewer/preview modes
    rsvpBar.style.display = 'flex';
    rsvpBar.style.visibility = 'visible';
    rsvpBar.style.opacity = '1';
    
    // Ensure proper positioning
    if (isViewer) {
      setupViewerRsvp();
    }
  }
}

// UPDATED: Setup RSVP handlers with comprehensive initialization
export function setupRsvpHandlers() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeRsvpHandlers();
      ensureRsvpVisibility();
    });
  } else {
    initializeRsvpHandlers();
    ensureRsvpVisibility();
  }
  
  // Also ensure visibility on window load
  window.addEventListener('load', () => {
    ensureRsvpVisibility();
  });
}

// Map controls with improved error handling
export function showMapControls() {
  const mapContainer = document.getElementById('mapContainer');
  if (mapContainer) {
    mapContainer.style.display = 'block';
  } else {
    console.warn('Map container not found');
  }
}

export function hideMapControls() {
  const mapContainer = document.getElementById('mapContainer');
  if (mapContainer) {
    mapContainer.style.display = 'none';
  }
}

// Responsive handling
window.addEventListener('resize', () => {
  syncTopbarHeight();
  ensureRsvpVisibility();
});

// Export additional utilities
export { 
  ensureRsvpVisibility,
  setupViewerMode,
  updateRsvpButtonStates
};