// main.js - Complete implementation with text editing integration

import { PurchasedDesignManager } from './purchased-design-manager.js';
import { AuthUIManager } from './auth-ui-manager.js';
import { EventHandlersManager } from './event-handlers.js';
import { ResponsiveManager } from './responsive-manager.js';
import { DragHandlersManager } from './drag-handlers.js';
import { initializeRsvpSystem } from './fixed-rsvp-system.js';
import { 
  initializeResponsive, 
  setupUIEventHandlers, 
  setupMapHandlers, 
  initializeForMode, 
  initializeViewerFullscreen 
} from './ui-manager.js';
import { applyViewerFromUrl, setupShareHandler } from './share-manager.js';
import { loadProject, initializeHistory } from './state-manager.js';
import { updateSlidesUI, loadSlideIntoDOM } from './slide-manager.js';
import { addTextLayer, setLocked } from './text-manager.js';
import { preloadSlideImageAt } from './image-manager.js';
import { workSize } from './utils.js';
import { initializeCollapsibleGroups, collapseAllGroups, expandAllGroups } from './collapsible-groups.js';
import apiClient from './api-client.js';

/**
 * Main Application Class with Enhanced Text Editing Support
 * Orchestrates the initialization and coordination of all app modules
 */
class InvitationMakerApp {
  constructor() {
    this.isInitialized = false;
    this.managers = {
      purchasedDesign: null,
      authUI: null,
      eventHandlers: null,
      responsive: null,
      dragHandlers: null
    };
    
    this.mode = this.detectMode();
    
    // Store text drag data
    this.textDragData = null;
    
    // Element references
    this.elements = {
      work: null,
      bgBox: null,
      userBgWrap: null
    };
  }

  /**
   * Detect application mode from URL
   */
  detectMode() {
    const urlPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const pathLast = urlPath.replace(/\/+$/,'').split('/').pop() || '';
    const token = urlParams.get('token') || pathLast;
    const isPurchasedDesign = /^acc_[A-Za-z0-9_-]+$/.test(token);
    
    return {
      isPurchasedDesign,
      isViewer: urlParams.has('view') || urlParams.get('mode') === 'view',
      token: isPurchasedDesign ? token : null
    };
  }

  /**
   * Initialize the appropriate mode
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('App already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Invitation Maker App...', this.mode);

      // Cache DOM elements
      this.cacheElements();

      // Initialize core UI systems first
      await this.initializeCoreUI();

      // Initialize mode-specific features
      if (this.mode.isPurchasedDesign) {
        await this.initializePurchasedDesignMode();
      } else {
        await this.initializeRegularMode();
      }

      // Initialize common features
      await this.initializeCommonFeatures();

      this.isInitialized = true;
      console.log('✅ App initialization complete');

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Cache frequently used DOM elements
   */
  cacheElements() {
    this.elements = {
      work: document.getElementById('work'),
      bgBox: document.getElementById('bgBox'),
      userBgWrap: document.getElementById('userBgWrap')
    };
  }

  /**
   * Initialize core UI systems
   */
  async initializeCoreUI() {
    console.log('📱 Initializing core UI...');
    
    // Apply viewer mode from URL first
    applyViewerFromUrl();
    
    // Initialize responsive system
    initializeResponsive();
    this.managers.responsive = new ResponsiveManager();
    await this.managers.responsive.initialize();
    
    // Setup UI event handlers
    setupUIEventHandlers();
    initializeForMode();
    initializeViewerFullscreen();
  }

  /**
   * Initialize purchased design mode
   */
  async initializePurchasedDesignMode() {
    console.log('🎨 Initializing purchased design mode...');
    
    this.managers.purchasedDesign = new PurchasedDesignManager(this.mode.token);
    await this.managers.purchasedDesign.initialize();
  }

  /**
   * Initialize regular editor mode
   */
  async initializeRegularMode() {
    console.log('✏️ Initializing regular editor mode...');
    
    // Setup authentication UI
    this.managers.authUI = new AuthUIManager();
    this.managers.authUI.initialize();
    
    // Load or create project
    const restored = await loadProject();
    updateSlidesUI();
    if (restored) {
      await loadSlideIntoDOM(restored.slides[restored.activeIndex ?? 0]);
    } else {
      await this.createDefaultProject();
    }
    
    // Show auth modal if not logged in
    if (!this.mode.isViewer) {
      this.managers.authUI.showModalIfNeeded();
    }
  }

  /**
   * Initialize features common to all modes with enhanced text editing support
   */
  async initializeCommonFeatures() {
    console.log('🔧 Initializing common features...');
    
    // Event handlers
    this.managers.eventHandlers = new EventHandlersManager();
    this.managers.eventHandlers.initialize();
    
    // Setup drag handlers with complete text editing context
    await this.initializeDragHandlers();
    
    // RSVP system
    initializeRsvpSystem();
    
    // Map handlers
    setupMapHandlers();
    
    // Share handler
    setupShareHandler();
    
    // History system
    initializeHistory();
    
    // Preload next slide
    preloadSlideImageAt(1);
    
    // Start background video
    this.startBackgroundVideo();
    
    // Setup global keyboard shortcuts for text editing
    this.setupGlobalKeyboardShortcuts();
  }

  /**
   * Enhanced drag handlers initialization with complete text editing context
   */
  async initializeDragHandlers() {
    console.log('🎯 Initializing drag handlers with text editing support...');
    
    try {
      // Import all required modules with error handling
      const imageManager = await import('./image-manager.js');
      const stateManager = await import('./state-manager.js');
      const uiManager = await import('./ui-manager.js');
      
      // Import text manager with complete editing support
      let textManager;
      try {
        textManager = await import('./text-manager.js');
      } catch (error) {
        console.warn('Text manager not available, using fallback');
        textManager = this.createTextManagerFallback();
      }
      
      // Create comprehensive drag context with text editing functions
      const dragContext = {
        // Core DOM elements
        work: this.elements.work,
        bgBox: this.elements.bgBox,
        userBgWrap: this.elements.userBgWrap,
        
        // Image state and functions
        imgState: imageManager.imgState,
        setTransforms: imageManager.setTransforms,
        enforceImageBounds: imageManager.enforceImageBounds,
        
        // UI functions
        showGuides: uiManager.showGuides || (() => {}),
        hideGuides: uiManager.hideGuides || (() => {}),
        
        // State management
        writeCurrentSlide: stateManager.writeCurrentSlide || (() => {}),
        saveProjectDebounced: stateManager.saveProjectDebounced || (() => {}),
        
        // Text layer functions
        setActiveLayer: textManager.setActiveLayer || this.setActiveLayerFallback.bind(this),
        getLocked: textManager.getLocked || (() => false),
        
        // NEW: Text editing functions
        enterTextEditMode: textManager.enterTextEditMode || (() => {}),
        exitTextEditMode: textManager.exitTextEditMode || (() => {}),
        isInEditMode: textManager.isInEditMode || (() => false),
        getEditingElement: textManager.getEditingElement || (() => null),
        
        // Drag helpers
        beginDragText: this.beginDragText.bind(this),
        endDragText: this.endDragText.bind(this),
        
        // Toolbar sync
        syncToolbarFromActive: textManager.syncToolbarFromActive || (() => {}),
        
        // Configuration
        snapThreshold: 8,
        enableSnapping: true,
        enableGuides: true
      };
      
      // Initialize drag handlers
      this.managers.dragHandlers = new DragHandlersManager();
      this.managers.dragHandlers.initialize(dragContext);
      
      // Setup transform handles
      this.setupTransformHandles();
      
      console.log('✅ Drag handlers with text editing initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize drag handlers:', error);
      // Setup basic fallback drag system only if no drag handlers are active
      if (!this.managers.dragHandlers || !this.managers.dragHandlers.isInitialized) {
        this.setupBasicDragFallback();
      }
    }
  }

  /**
   * Setup global keyboard shortcuts for text editing
   */
  setupGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // F2 to edit selected text layer
      if (e.key === 'F2') {
        e.preventDefault();
        const activeLayer = document.querySelector('.layer.active');
        if (activeLayer && activeLayer.classList.contains('text-layer')) {
          import('./text-manager.js').then(({ enterTextEditMode }) => {
            enterTextEditMode(activeLayer);
          });
        }
      }
      
      // Escape to exit edit mode
      if (e.key === 'Escape') {
        import('./text-manager.js').then(({ exitTextEditMode, isInEditMode }) => {
          if (isInEditMode()) {
            exitTextEditMode();
          }
        });
      }
      
      // Ctrl+E to toggle edit mode for active layer
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        const activeLayer = document.querySelector('.layer.active');
        if (activeLayer && activeLayer.classList.contains('text-layer')) {
          import('./text-manager.js').then(({ enterTextEditMode, exitTextEditMode, isInEditMode, getEditingElement }) => {
            if (isInEditMode() && getEditingElement() === activeLayer) {
              exitTextEditMode();
            } else {
              enterTextEditMode(activeLayer);
            }
          });
        }
      }
    });
  }

  /**
   * Create text manager fallback
   */
  createTextManagerFallback() {
    return {
      setActiveLayer: this.setActiveLayerFallback.bind(this),
      getLocked: () => false,
      enterTextEditMode: () => {},
      exitTextEditMode: () => {},
      isInEditMode: () => false,
      getEditingElement: () => null,
      syncToolbarFromActive: () => {}
    };
  }

  /**
   * Fallback for setting active layer with enhanced state preservation
   */
  setActiveLayerFallback(layer) {
    if (!layer) return;
    
    // Remove active class from all layers
    document.querySelectorAll('.layer').forEach(l => {
      l.classList.remove('active');
    });
    
    // Add active class to the specified layer
    layer.classList.add('active');
    
    // Force repaint to ensure CSS is applied
    layer.offsetHeight; // Trigger reflow
    
    // Double-check the active class is still there
    setTimeout(() => {
      if (!layer.classList.contains('active')) {
        layer.classList.add('active');
        console.warn('Had to re-add active class to layer');
      }
    }, 0);
    
    console.log('Set active layer (fallback):', layer);
  }

  /**
   * Enhanced text drag helper with edit mode checking
   */
  beginDragText(e) {
    try {
      const layer = e.target.closest('.layer');
      if (!layer) return false;
      
      // CRITICAL: Don't start drag if in edit mode
      if (layer.dataset.editing === 'true' || layer.contentEditable === 'true') {
        console.log('🚫 Text is in edit mode - skipping drag');
        return false;
      }
      
      // Set as active layer
      this.setActiveLayerFallback(layer);
      
      // Add dragging class
      layer.classList.add('dragging');
      document.body.classList.add('dragging');
      
      // Store drag data
      this.textDragData = {
        element: layer,
        startLeft: parseFloat(layer.style.left || '0'),
        startTop: parseFloat(layer.style.top || '0'),
        startX: e.clientX,
        startY: e.clientY
      };
      
      console.log('✅ Started text drag');
      return true;
    } catch (error) {
      console.error('Failed to begin text drag:', error);
      return false;
    }
  }

  /**
   * Enhanced end text drag with active state preservation
   */
  endDragText() {
    try {
      if (this.textDragData?.element) {
        const element = this.textDragData.element;
        
        // Remove dragging class
        element.classList.remove('dragging');
        
        // CRITICAL: Ensure element stays active
        if (!element.classList.contains('active')) {
          element.classList.add('active');
        }
        
        // Force visual update
        element.style.outline = '2px solid rgba(37, 99, 235, 0.8)';
        element.style.outlineOffset = '2px';
        element.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.15)';
        
        // Clear the inline styles after a brief moment to let CSS take over
        setTimeout(() => {
          element.style.outline = '';
          element.style.outlineOffset = '';
          element.style.boxShadow = '';
        }, 50);
      }
      
      this.textDragData = null;
      console.log('✅ Ended text drag');
    } catch (error) {
      console.error('Failed to end text drag:', error);
    }
  }

  /**
   * Setup transform handles for image manipulation
   */
  setupTransformHandles() {
    const bgBox = this.elements.bgBox;
    if (!bgBox) {
      console.warn('Background box not found for transform handles');
      return;
    }
    
    // Handle types and their positions
    const handles = [
      { type: 'nw', style: { left: '-7px', top: '-7px', cursor: 'nwse-resize' } },
      { type: 'ne', style: { right: '-7px', top: '-7px', cursor: 'nesw-resize' } },
      { type: 'se', style: { right: '-7px', bottom: '-7px', cursor: 'nwse-resize' } },
      { type: 'sw', style: { left: '-7px', bottom: '-7px', cursor: 'nesw-resize' } },
      { type: 'rotate', style: { left: '50%', top: '-32px', transform: 'translateX(-50%)', cursor: 'grab' } }
    ];
    
    handles.forEach(({ type, style }) => {
      let handle = bgBox.querySelector(`[data-handle="${type}"]`);
      
      if (!handle) {
        handle = document.createElement('div');
        handle.className = `handle ${type}`;
        handle.dataset.handle = type;
        
        // Apply styles
        Object.assign(handle.style, {
          position: 'absolute',
          width: '14px',
          height: '14px',
          background: 'linear-gradient(135deg, #0b1630, #1e293b)',
          border: type === 'rotate' ? '2px solid #7c3aed' : '2px solid #2563eb',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
          touchAction: 'none',
          zIndex: '21',
          transition: 'all 0.15s ease',
          ...style
        });
        
        bgBox.appendChild(handle);
      }
    });
    
    console.log('✅ Transform handles setup complete');
  }

  /**
   * Basic drag fallback system with edit mode awareness.
   * @deprecated Retained for legacy support; not used when DragHandlersManager
   *             initializes successfully.
   */
  setupBasicDragFallback() {
    console.log('🔄 Setting up basic drag fallback (deprecated)...');
    
    const work = this.elements.work;
    if (!work) {
      console.error('Work element not found');
      return;
    }
    
    let dragState = null;
    
    // Pointer down handler
    const handlePointerDown = async (e) => {
      if (e.button !== 0) return;
      
      const body = document.body;
      if (body.classList.contains('preview') || body.classList.contains('viewer')) {
        return;
      }
      
      const layer = e.target.closest('.layer');
      
      // Check if in edit mode
      if (layer && (layer.dataset.editing === 'true' || layer.contentEditable === 'true')) {
        return; // Allow text editing
      }
      
      const bgBox = this.elements.bgBox;
      const isImageArea = e.target === work || e.target.closest('#userBgWrap') || e.target === bgBox;
      
      // Import image state
      let imgState;
      try {
        const imageModule = await import('./image-manager.js');
        imgState = imageModule.imgState;
      } catch (error) {
        console.warn('Could not access image state');
        return;
      }
      
      if (layer) {
        // Text drag
        e.preventDefault();
        e.stopPropagation();
        
        this.setActiveLayerFallback(layer);
        
        dragState = {
          type: 'text',
          element: layer,
          startX: e.clientX,
          startY: e.clientY,
          startLeft: parseFloat(layer.style.left || '0'),
          startTop: parseFloat(layer.style.top || '0')
        };
        
        layer.classList.add('dragging');
        work.setPointerCapture(e.pointerId);
        
      } else if (isImageArea && imgState?.has) {
        // Image drag
        e.preventDefault();
        e.stopPropagation();
        
        dragState = {
          type: 'image',
          startX: e.clientX,
          startY: e.clientY,
          startCx: imgState.cx,
          startCy: imgState.cy
        };
        
        work.setPointerCapture(e.pointerId);
      }
    };
    
    // Pointer move handler
    const handlePointerMove = async (e) => {
      if (!dragState) return;
      
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      
      if (dragState.type === 'text' && dragState.element) {
        dragState.element.style.left = (dragState.startLeft + dx) + 'px';
        dragState.element.style.top = (dragState.startTop + dy) + 'px';
      } else if (dragState.type === 'image') {
        try {
          const imageModule = await import('./image-manager.js');
          const { imgState, setTransforms, enforceImageBounds } = imageModule;
          
          imgState.cx = dragState.startCx + dx;
          imgState.cy = dragState.startCy + dy;
          
          if (enforceImageBounds && !document.body.classList.contains('viewer')) enforceImageBounds();
          if (setTransforms && !document.body.classList.contains('viewer')) setTransforms(false);
        } catch (error) {
          console.warn('Could not update image position');
        }
      }
    };
    
    // Pointer up handler
    const handlePointerUp = async (e) => {
      if (!dragState) return;
      
      if (dragState.element) {
        dragState.element.classList.remove('dragging');
        // Ensure element stays active
        dragState.element.classList.add('active');
      }
      
      // Save changes
      try {
        const { syncImageCoordinates } = await import('./image-manager.js');
        syncImageCoordinates(true);
        const stateModule = await import('./state-manager.js');
        if (stateModule.writeCurrentSlide) stateModule.writeCurrentSlide();
        if (stateModule.saveProjectDebounced) stateModule.saveProjectDebounced();
      } catch (error) {
        console.warn('Could not save changes');
      }
      
      dragState = null;
      
      if (work && work.releasePointerCapture) {
        try {
          work.releasePointerCapture(e.pointerId);
        } catch (error) {
          console.warn('Could not release pointer capture:', error);
        }
      }
    };
    
    // NOTE: This deprecated fallback intentionally leaves its event listeners
    // commented out to avoid accidental activation. Remove this function if
    // legacy support is no longer required.
    // work.addEventListener('pointerdown', handlePointerDown);
    // work.addEventListener('pointermove', handlePointerMove);
    // work.addEventListener('pointerup', handlePointerUp);
    // work.addEventListener('pointercancel', handlePointerUp);
    
    console.log('✅ Basic drag fallback with edit mode support initialized');
  }

  /**
   * Create default project for new users
   */
  async createDefaultProject() {
    const size = workSize();
    await loadSlideIntoDOM({
      image: null,
      layers: [],
      workSize: size,
      durationMs: 3000
    });

    addTextLayer("You're invited!", {
      fontSize: 48,
      fontWeight: 'bold',
      color: '#ffffff',
      left: size.w / 2 - 120,
      top: size.h / 2 - 24
    });
  }

  /**
   * Start background video with error handling
   */
  startBackgroundVideo() {
    const fxVideo = document.querySelector('#fxVideo');
    if (fxVideo && fxVideo.play) {
      fxVideo.play().catch(() => {
        console.log('Background video autoplay blocked by browser');
      });
    }
  }

  /**
   * Handle initialization errors gracefully
   */
  handleInitializationError(error) {
    console.error('Failed to load editor', error);

    // Show user-friendly error
    const errorCard = document.createElement('div');
    errorCard.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1f2937;
      color: #e5e7eb;
      padding: 24px;
      border-radius: 12px;
      text-align: center;
      z-index: 9999;
      max-width: 400px;
    `;
    errorCard.innerHTML = `
      <h3 style="margin: 0 0 12px; color: #ef4444;">Initialization Failed</h3>
      <p style="margin: 0 0 16px;">Something went wrong loading the app. Please refresh the page.</p>
      <button onclick="window.location.reload()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
        Refresh Page
      </button>
    `;
    document.body.appendChild(errorCard);
  }

  /**
   * Get manager instance
   */
  getManager(name) {
    return this.managers[name];
  }

  /**
   * Check if app is initialized
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Get current edit mode status
   */
  isInEditMode() {
    try {
      // Try to get from text manager
      return import('./text-manager.js').then(({ isInEditMode }) => {
        return isInEditMode();
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Exit edit mode programmatically
   */
  exitEditMode() {
    try {
      import('./text-manager.js').then(({ exitTextEditMode }) => {
        exitTextEditMode();
      });
    } catch (error) {
      console.warn('Could not exit edit mode');
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    Object.values(this.managers).forEach(manager => {
      if (manager?.destroy) {
        manager.destroy();
      }
    });
    
    this.isInitialized = false;
    console.log('App destroyed');
  }
}

// Initialize the app
const invitationApp = new InvitationMakerApp();

// Make app available globally
window.invitationApp = invitationApp;
window.collapseAllGroups = collapseAllGroups;
window.expandAllGroups = expandAllGroups;

function setupPanelControls() {
  const collapseBtn = document.getElementById('collapseAllBtn');
  const expandBtn = document.getElementById('expandAllBtn');
  if (collapseBtn) collapseBtn.addEventListener('click', collapseAllGroups);
  if (expandBtn) expandBtn.addEventListener('click', expandAllGroups);
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    invitationApp.initialize();
    initializeCollapsibleGroups();
    setupPanelControls();
  });
} else {
  invitationApp.initialize();
  initializeCollapsibleGroups();
  setupPanelControls();
}

const breadcrumbNav = document.getElementById('breadcrumbs');
const marketplacePage = document.getElementById('marketplacePage');
const editorPage = document.getElementById('editorPage');
const authModalEl = document.getElementById('authModal');
const designGrid = document.getElementById('designGrid');
const previewModal = document.getElementById('previewModal');
const previewSlides = document.getElementById('previewSlides');
const useDesignBtn = document.getElementById('useDesignBtn');
const previewClose = document.getElementById('previewClose');
const favoriteDesignBtn = document.getElementById('favoriteDesignBtn');
const tokenBalanceEl = document.getElementById('tokenBalance');
const purchaseModal = document.getElementById('purchaseModal');
const purchaseMessage = document.getElementById('purchaseMessage');
const purchaseConfirm = document.getElementById('purchaseConfirm');
const purchaseCancel = document.getElementById('purchaseCancel');
const categoryTabs = document.getElementById('categoryTabs');
const designSearch = document.getElementById('designSearch');
let currentPage = 'login';
let designsLoaded = false;
let currentPreviewDesign = null;
let selectedCategory = '';
let searchTerm = '';
let tokenBalance = 0;

function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function getFavorites() {
  return readList('favorites');
}

function saveFavorites(list) {
  saveList('favorites', list);
}

function isFavorite(design) {
  return getFavorites().some((d) => d.id === design.id);
}

function toggleFavorite(design) {
  const favs = getFavorites();
  const idx = favs.findIndex((d) => d.id === design.id);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(design);
  }
  saveFavorites(favs);
  if (favoriteDesignBtn) {
    favoriteDesignBtn.textContent = isFavorite(design) ? 'Unfavorite' : 'Favorite';
  }
  if (selectedCategory === 'favorites') {
    renderDesignGrid(favs);
  }
}

function getRecent() {
  return readList('recent');
}

function saveRecent(list) {
  saveList('recent', list);
}

function addRecent(design) {
  const recents = getRecent();
  const idx = recents.findIndex((d) => d.id === design.id);
  if (idx >= 0) recents.splice(idx, 1);
  recents.unshift(design);
  if (recents.length > 10) recents.pop();
  saveRecent(recents);
}

if (categoryTabs) {
  categoryTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('li[data-category]');
    if (!tab) return;
    selectedCategory = tab.dataset.category || '';
    Array.from(categoryTabs.querySelectorAll('li')).forEach((el) => {
      el.classList.toggle('active', el === tab);
    });
    loadMarketplaceDesigns();
  });
}

if (designSearch) {
  designSearch.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    loadMarketplaceDesigns();
  });
}

async function refreshTokenBalance() {
  try {
    const res = await apiClient.getUserTokens();
    tokenBalance = res.tokens || 0;
    if (tokenBalanceEl) tokenBalanceEl.textContent = `Tokens: ${tokenBalance}`;
  } catch (err) {
    tokenBalance = 0;
    if (tokenBalanceEl) tokenBalanceEl.textContent = 'Tokens: 0';
  }
}

function showPurchaseModal(mode) {
  if (!purchaseModal) return;
  purchaseModal.classList.remove('hidden');
  if (mode === 'buy') {
    purchaseMessage.textContent = 'You have no tokens. Purchase 5 tokens?';
    purchaseConfirm.textContent = 'Purchase';
    purchaseConfirm.onclick = async () => {
      await apiClient.updateTokens(5);
      await refreshTokenBalance();
      purchaseModal.classList.add('hidden');
      unlockDesignFlow();
    };
  } else {
    purchaseMessage.textContent = 'Spend 1 token to unlock this design?';
    purchaseConfirm.textContent = 'Unlock';
    purchaseConfirm.onclick = async () => {
      await apiClient.updateTokens(-1);
      await refreshTokenBalance();
      setLocked(false);
      purchaseModal.classList.add('hidden');
    };
  }
}

if (purchaseCancel) {
  purchaseCancel.onclick = () => {
    purchaseModal.classList.add('hidden');
    navigate('marketplace');
  };
}

async function unlockDesignFlow() {
  setLocked(true);
  await refreshTokenBalance();
  if (tokenBalance <= 0) {
    showPurchaseModal('buy');
  } else {
    showPurchaseModal('spend');
  }
}

function renderBreadcrumbs() {
  const crumbs = [];
  if (currentPage === 'login') {
    crumbs.push('<span>Login</span>');
  } else if (currentPage === 'marketplace') {
    crumbs.push('<a href="#" data-nav="login">Login</a>', '<span>Marketplace</span>');
  } else if (currentPage === 'editor') {
    crumbs.push('<a href="#" data-nav="login">Login</a>', '<a href="#" data-nav="marketplace">Marketplace</a>', '<span>Editor</span>');
  }
  if (breadcrumbNav) {
    breadcrumbNav.innerHTML = crumbs.join(' &gt; ');
  }
}

function showPage(page) {
  currentPage = page;
  if (authModalEl) authModalEl.style.display = page === 'login' ? 'flex' : 'none';
  if (marketplacePage) marketplacePage.classList.toggle('hidden', page !== 'marketplace');
  if (editorPage) editorPage.classList.toggle('hidden', page !== 'editor');
  if (page === 'marketplace' && !designsLoaded) loadMarketplaceDesigns();
  renderBreadcrumbs();
}

function navigate(page, replace = false) {
  showPage(page);
  const method = replace ? 'replaceState' : 'pushState';
  history[method]({ page }, '', `#${page}`);
  if (page === 'editor') {
    unlockDesignFlow();
  }
}

async function loadMarketplaceDesigns() {
  try {
    if (selectedCategory === 'favorites') {
      const designs = getFavorites();
      renderDesignGrid(designs);
      designsLoaded = true;
      return;
    }
    if (selectedCategory === 'recently-viewed') {
      const designs = getRecent();
      renderDesignGrid(designs);
      designsLoaded = true;
      return;
    }
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (searchTerm) params.set('search', searchTerm);
    const query = params.toString();
    const res = await fetch(`/api/designs${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch designs');
    const designs = await res.json();
    renderDesignGrid(designs);
    designsLoaded = true;
  } catch (err) {
    console.error('Error loading designs', err);
  }
}

function renderDesignGrid(designs) {
  if (!designGrid) return;
  designGrid.innerHTML = '';
  designs.forEach((design) => {
    const card = document.createElement('div');
    card.className = 'design-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Preview design ${design.title}`);
    const badgeLabel = selectedCategory === 'popular'
      ? 'Popular'
      : selectedCategory === 'recent'
        ? 'New'
        : design.category || 'General';
    const fav = isFavorite(design);
    card.innerHTML = `
      <button class="fav-btn" aria-label="Toggle favorite">${fav ? '★' : '☆'}</button>
      <img src="${design.thumbnailUrl}" alt="${design.title}" class="design-thumb" loading="lazy">
      <div class="design-info">
        <div class="design-title">${design.title}</div>
        <div class="design-meta">
          <span class="badge">${badgeLabel}</span>
          <span class="price-label">${design.premium ? 'Premium' : 'Free'}</span>
        </div>
      </div>`;
    card.addEventListener('click', () => openPreview(design));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPreview(design);
      }
    });
    const favBtn = card.querySelector('.fav-btn');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(design);
      favBtn.textContent = isFavorite(design) ? '★' : '☆';
    });
    designGrid.appendChild(card);
  });
}

function openPreview(design) {
  currentPreviewDesign = design;
  if (!previewModal || !previewSlides) return;
  previewSlides.innerHTML = '';
  const slides = design.slides && design.slides.length ? design.slides : [design.thumbnailUrl];
  slides.forEach((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = design.title;
    img.loading = 'lazy';
    previewSlides.appendChild(img);
  });
  previewModal.classList.remove('hidden');
  addRecent(design);
  fetch('/api/analytics/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ designId: design.id })
  }).catch(() => {});
  if (favoriteDesignBtn) {
    favoriteDesignBtn.textContent = isFavorite(design) ? 'Unfavorite' : 'Favorite';
  }
}

function closePreview() {
  previewModal?.classList.add('hidden');
  currentPreviewDesign = null;
}

window.addEventListener('popstate', (e) => {
  const page = e.state?.page || 'login';
  showPage(page);
});

document.getElementById('loginForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  navigate('marketplace');
});

document.getElementById('skipToEditor')?.addEventListener('click', (e) => {
  e.preventDefault();
  navigate('editor');
});

breadcrumbNav?.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-nav]');
  if (link) {
    e.preventDefault();
    navigate(link.getAttribute('data-nav'));
  }
});

previewClose?.addEventListener('click', closePreview);
previewModal?.addEventListener('click', (e) => {
  if (e.target === previewModal) closePreview();
});

useDesignBtn?.addEventListener('click', () => {
  if (currentPreviewDesign) {
    fetch('/api/analytics/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designId: currentPreviewDesign.id })
    }).catch(() => {});
    navigate('editor');
    closePreview();
  }
});

favoriteDesignBtn?.addEventListener('click', () => {
  if (currentPreviewDesign) {
    toggleFavorite(currentPreviewDesign);
  }
});

refreshTokenBalance();
navigate('login', true);

export { invitationApp };
