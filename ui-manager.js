// ui-manager.js - Updated with fixed RSVP system

import { setTransforms } from './image-manager.js';
import { resetOpacities } from './slide-manager.js';
import { initializeRsvpSystem } from './fixed-rsvp-system.js';

// Top bar and mobile responsiveness
export function syncTopbarHeight() {
  const body = document.body;
  const topbar = document.getElementById('topbar');
  const h = body.classList.contains('viewer') ? 0 : Math.max(40, topbar?.offsetHeight || 40);
  document.documentElement.style.setProperty('--topbar-h', h + 'px');
}

export function setMobileTopbarCollapsed(collapsed) {
  const body = document.body;
  const topbarToggle = document.getElementById('topbarToggle');
  
  body.classList.toggle('mb-topbar-collapsed', collapsed);
  topbarToggle.setAttribute('aria-expanded', String(!collapsed));
  topbarToggle.textContent = collapsed ? '▾' : '▴';
  syncTopbarHeight();
}

export function initializeResponsive() {
  window.addEventListener('load', syncTopbarHeight);
  window.addEventListener('resize', syncTopbarHeight);
  
  const topbarToggle = document.getElementById('topbarToggle');
  topbarToggle.addEventListener('click', () => {
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

// Panel management
export function openPanel() {
  const body = document.body;
  const togglePanelBtn = document.getElementById('togglePanelBtn');
  const previewBtn = document.getElementById('previewBtn');
  
  body.classList.remove('preview');
  body.classList.add('panel-open');
  togglePanelBtn?.setAttribute('aria-expanded', 'true');
  previewBtn?.setAttribute('aria-pressed', 'false');
  previewBtn && (previewBtn.textContent = 'Preview');
  setTransforms();
}

export function closePanel() {
  const body = document.body;
  const togglePanelBtn = document.getElementById('togglePanelBtn');
  
  body.classList.remove('panel-open');
  togglePanelBtn?.setAttribute('aria-expanded', 'false');
}

export function togglePanel() {
  const body = document.body;
  if (body.classList.contains('panel-open')) {
    closePanel();
  } else {
    openPanel();
  }
}

// Preview mode
export function enterPreview() {
  const body = document.body;
  const previewBtn = document.getElementById('previewBtn');
  const work = document.querySelector('#work');
  
  body.classList.add('preview');
  closePanel();
  hideGuides();
  previewBtn?.setAttribute('aria-pressed', 'true');
  previewBtn && (previewBtn.textContent = 'Exit Preview');
  [...work.querySelectorAll('.layer')].forEach(l => l.style.outline = '');
  setTransforms();
}

export function exitPreview() {
  const body = document.body;
  const previewBtn = document.getElementById('previewBtn');
  
  body.classList.remove('preview');
  previewBtn?.setAttribute('aria-pressed', 'false');
  previewBtn && (previewBtn.textContent = 'Preview');
  setTransforms();
  resetOpacities();
}

export function togglePreview() {
  const body = document.body;
  if (body.classList.contains('preview')) {
    exitPreview();
  } else {
    enterPreview();
  }
}

// Guide visibility
export function showGuides({ v = false, h = false } = {}) {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  vGuide.style.display = v ? 'block' : 'none';
  hGuide.style.display = h ? 'block' : 'none';
}

export function hideGuides() {
  const vGuide = document.getElementById('vGuide');
  const hGuide = document.getElementById('hGuide');
  vGuide.style.display = 'none';
  hGuide.style.display = 'none';
}

// Event handlers setup
export function setupUIEventHandlers() {
  const togglePanelBtn = document.getElementById('togglePanelBtn');
  const previewBtn = document.getElementById('previewBtn');
  const backdrop = document.getElementById('backdrop');
  
  togglePanelBtn?.addEventListener('click', togglePanel);
  previewBtn?.addEventListener('click', togglePreview);
  backdrop.addEventListener('click', closePanel);
  
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
    if (!getIsViewer()) {
      const isDesktop = window.matchMedia('(min-width: 960px)').matches;
      if (isDesktop) {
        openPanel();
      } else {
        closePanel();
      }
    } else {
      closePanel();
      // CRITICAL FIX: Ensure RSVP bar is visible and positioned in viewer mode
      setupViewerRsvp();
    }
  });
  
  setMobileTopbarCollapsed(false);
}

// FIXED: Setup RSVP for viewer mode
function setupViewerRsvp() {
  const rsvpBar = document.getElementById('rsvpBar');
  if (rsvpBar) {
    // Ensure RSVP bar is visible in viewer mode
    rsvpBar.style.display = 'flex';
    rsvpBar.style.position = 'fixed';
    rsvpBar.style.bottom = 'max(12px, env(safe-area-inset-bottom))';
    rsvpBar.style.left = 'max(12px, env(safe-area-inset-left))';
    rsvpBar.style.right = 'max(12px, env(safe-area-inset-right))';
    rsvpBar.style.zIndex = '1200';
    rsvpBar.style.pointerEvents = 'auto';
    console.log('RSVP bar setup for viewer mode');
  }
}

// UPDATED: Setup RSVP handlers with new system
export function setupRsvpHandlers() {
  // Use the new RSVP system
  initializeRsvpSystem();
}

// Map controls (unchanged but improved error handling)
export function setupMapHandlers() {
  const mapInput = document.getElementById('mapInput');
  const mapOpenBtn = document.getElementById('mapOpenBtn');
  const mapCopyBtn = document.getElementById('mapCopyBtn');
  
  if (!mapInput || !mapOpenBtn || !mapCopyBtn) {
    console.warn('Map elements not found');
    return;
  }
  
  import('./state-manager.js').then(({ handleMapQuery, getMapUrl }) => {
    mapInput.addEventListener('input', (e) => handleMapQuery(e.target.value));
    
    mapOpenBtn.addEventListener('click', () => {
      const query = (mapInput.value || '').trim();
      if (!query) {
        mapInput.focus();
        return;
      }
      handleMapQuery(query);
      window.open(getMapUrl(), '_blank', 'noopener,noreferrer');
    });
    
    mapCopyBtn.addEventListener('click', async () => {
      const query = (mapInput.value || '').trim();
      if (!query) {
        mapInput.focus();
        return;
      }
      handleMapQuery(query);
      const url = getMapUrl();
      
      try {
        await navigator.clipboard.writeText(url);
        const originalText = mapCopyBtn.textContent;
        mapCopyBtn.textContent = 'Copied!';
        setTimeout(() => mapCopyBtn.textContent = originalText, 1200);
      } catch (clipboardError) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.top = '-1000px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const originalText = mapCopyBtn.textContent;
        mapCopyBtn.textContent = 'Copied!';
        setTimeout(() => mapCopyBtn.textContent = originalText, 1200);
      }
    });
  }).catch(error => {
    console.error('Failed to setup map handlers:', error);
  });
}

// Fullscreen functionality for viewer mode (enhanced)
export function initializeViewerFullscreen() {
  const body = document.body;
  const isViewer = body.classList.contains('viewer');
  if (!isViewer) return;

  const overlay = document.getElementById('fsOverlay');
  const btn = document.getElementById('fsEnterBtn');
  if (!overlay || !btn) return;

  const docEl = document.documentElement;
  const supportsFS = !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  function hideOverlay() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function showOverlay() {
    if (document.fullscreenElement || isStandalone || !supportsFS) return;
    overlay.classList.add('show');
    overlay.removeAttribute('aria-hidden');
  }

  async function enterFullscreen() {
    try {
      if (document.fullscreenElement || !supportsFS) {
        hideOverlay();
        return;
      }
      if (docEl.requestFullscreen) await docEl.requestFullscreen();
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
      hideOverlay();
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
      showOverlay();
    }
  }

  window.addEventListener('load', () => {
    if (!isStandalone && supportsFS) {
      setTimeout(() => {
        enterFullscreen().catch(showOverlay);
      }, 350);
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && !isStandalone) showOverlay();
  });

  const oneTap = () => {
    enterFullscreen();
    document.removeEventListener('touchend', oneTap);
    document.removeEventListener('click', oneTap);
  };
  document.addEventListener('touchend', oneTap, { passive: true, once: true });
  document.addEventListener('click', oneTap, { once: true });

  btn.addEventListener('click', enterFullscreen);

  if (!supportsFS || isStandalone) hideOverlay();
}