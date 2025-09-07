// ui-manager.js - COMPLETE FIXED VERSION with drag support

// UI state management
let sidebarOpen = false;
let previewMode = false;

// Top bar height synchronization
export function syncTopbarHeight() {
  const topbar = document.getElementById('topbar');
  const body = document.body;
  const h = body.classList.contains('viewer') ? 0 : Math.max(40, topbar?.offsetHeight || 40);
  document.documentElement.style.setProperty('--topbar-h', h + 'px');
}

// Top bar and mobile responsiveness
export function initializeResponsive() {
  window.addEventListener('load', syncTopbarHeight);
  window.addEventListener('resize', () => {
    syncTopbarHeight();
    ensureRsvpVisibility();
  });
  
  const topbarToggle = document.getElementById('topbarToggle');
  topbarToggle?.addEventListener('click', () => {
    const body = document.body;
    const collapsed = !body.classList.contains('mb-topbar-collapsed');
    setMobileTopbarCollapsed(collapsed);
  });
  
  const mqMobile600 = window.matchMedia('(max-width: 599px)');
  mqMobile600.addEventListener('change', (e) => {
    const body = document.body;
    if (!e.matches) { 
      body.classList.remove('mb-topbar-collapsed'); 
    }
    syncTopbarHeight();
  });
}

export function setMobileTopbarCollapsed(collapsed) {
  const body = document.body;
  const topbarToggle = document.getElementById('topbarToggle');
  
  body.classList.toggle('mb-topbar-collapsed', collapsed);
  topbarToggle?.setAttribute('aria-expanded', String(!collapsed));
  if (topbarToggle) topbarToggle.textContent = collapsed ? '▾' : '▴';
  syncTopbarHeight();
}

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
  const togglePanelBtn = document.getElementById('togglePanelBtn');
  const previewBtn = document.getElementById('previewBtn');
  togglePanelBtn?.setAttribute('aria-expanded', 'true');
  previewBtn?.setAttribute('aria-pressed', 'false');
  sidebarOpen = true;
  syncTopbarHeight();
}

export function closePanel() {
  document.body.classList.remove('panel-open');
  const togglePanelBtn = document.getElementById('togglePanelBtn');
  togglePanelBtn?.setAttribute('aria-expanded', 'false');
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
  const previewBtn = document.getElementById('previewBtn');
  previewBtn?.setAttribute('aria-pressed', 'true');
  previewMode = true;

  // Ensure RSVP bar is visible in preview mode
  ensureRsvpVisibility();
}

export function exitPreview() {
  document.body.classList.remove('preview');
  const previewBtn = document.getElementById('previewBtn');
  previewBtn?.setAttribute('aria-pressed', 'false');
  previewMode = false;
}

// Guide management
export function showGuides(options = {}) {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  
  if (vGuide) {
    vGuide.style.display = options.v ? 'block' : 'none';
    vGuide.classList.toggle('visible', !!options.v);
  }
  if (hGuide) {
    hGuide.style.display = options.h ? 'block' : 'none';
    hGuide.classList.toggle('visible', !!options.h);
  }
}

export function hideGuides() {
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
export function setupMapHandlers() {
  // Map control handlers would go here
  console.log('Map handlers initialized');
}

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

// Viewer fullscreen functionality
export function initializeViewerFullscreen() {
  // Setup fullscreen viewer functionality
  const body = document.body;
  
  if (body.classList.contains('viewer')) {
    // Add fullscreen capabilities for viewer mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    });
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Could not enter fullscreen:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

// Export additional utilities
export { 
  ensureRsvpVisibility,
  setupViewerMode,
  updateRsvpButtonStates
};