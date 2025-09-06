// main.js - FIXED: Complete version with proper drag initialization

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
import { addTextLayer } from './text-manager.js';
import { preloadSlideImageAt } from './image-manager.js';
import { workSize } from './utils.js';

/**
 * Main Application Class
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
    
    if (!restored) {
      await this.createDefaultProject();
    }
    
    // Show auth modal if not logged in
    if (!this.mode.isViewer) {
      this.managers.authUI.showModalIfNeeded();
    }
  }

  /**
   * FIXED: Initialize features common to all modes with proper drag setup
   */
  async initializeCommonFeatures() {
    console.log('🔧 Initializing common features...');
    
    // Event handlers
    this.managers.eventHandlers = new EventHandlersManager();
    this.managers.eventHandlers.initialize();
    
    // FIXED: Setup drag handlers with complete context
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
  }

  /**
   * FIXED: Initialize drag handlers with complete context
   */
  async initializeDragHandlers() {
    console.log('🎯 Initializing drag handlers...');
    
    try {
      // Import all required modules with error handling
      const imageManager = await import('./image-manager.js');
      const stateManager = await import('./state-manager.js');
      const uiManager = await import('./ui-manager.js');
      
      // Try to import text manager with fallback
      let textManager;
      try {
        textManager = await import('./text-manager.js');
      } catch (error) {
        console.warn('Text manager not available, using fallback');
        textManager = this.createTextManagerFallback();
      }
      
      // Create comprehensive drag context
      const dragContext = {
        // Core DOM elements
        work: document.getElementById('work'),
        bgBox: document.getElementById('bgBox'),
        userBgWrap: document.getElementById('userBgWrap'),
        
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
        
        // Text functions
        setActiveLayer: textManager.setActiveLayer || this.setActiveLayerFallback.bind(this),
        getLocked: textManager.getLocked || (() => false),
        
        // Drag helpers
        beginDragText: this.beginDragText.bind(this),
        endDragText: this.endDragText.bind(this),
        
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
      
      console.log('✅ Drag handlers initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize drag handlers:', error);
      // Setup basic fallback drag system
      this.setupBasicDragFallback();
    }
  }

  /**
   * FIXED: Create text manager fallback
   */
  createTextManagerFallback() {
    return {
      setActiveLayer: this.setActiveLayerFallback.bind(this),
      getLocked: () => false
    };
  }

  /**
   * FIXED: Fallback for setting active layer
   */
  setActiveLayerFallback(layer) {
    if (!layer) return;
    
    // Remove active class from all layers
    document.querySelectorAll('.layer').forEach(l => {
      l.classList.remove('active');
    });
    
    // Add active class to the specified layer
    layer.classList.add('active');
    
    console.log('Set active layer (fallback):', layer);
  }

  /**
   * FIXED: Text drag helper methods
   */
  beginDragText(e) {
    try {
      const layer = e.target.closest('.layer');
      if (!layer) return false;
      
      // Set as active layer
      this.setActiveLayerFallback(layer);
      
      // Add dragging class
      layer.classList.add('dragging');
      
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
   * FIXED: End text drag
   */
  endDragText() {
    try {
      if (this.textDragData?.element) {
        this.textDragData.element.classList.remove('dragging');
      }
      this.textDragData = null;
      console.log('✅ Ended text drag');
    } catch (error) {
      console.error('Failed to end text drag:', error);
    }
  }

  /**
   * FIXED: Setup transform handles for image manipulation
   */
  setupTransformHandles() {
    const bgBox = document.getElementById('bgBox');
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
   * FIXED: Basic drag fallback system
   */
  setupBasicDragFallback() {
    console.log('🔄 Setting up basic drag fallback...');
    
    const work = document.getElementById('work');
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
      
      const bgBox = document.getElementById('bgBox');
      const layer = e.target.closest('.layer');
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
          
          if (enforceImageBounds) enforceImageBounds();
          if (setTransforms) setTransforms();
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
      }
      
      // Save changes
      try {
        const stateModule = await import('./state-manager.js');
        if (stateModule.writeCurrentSlide) stateModule.writeCurrentSlide();
        if (stateModule.saveProjectDebounced) stateModule.saveProjectDebounced();
      } catch (error) {
        console.warn('Could not save changes');
      }
      
      dragState = null;
      
      if (work.hasPointerCapture(e.pointerId)) {
        work.releasePointerCapture(e.pointerId);
      }
    };
    
    // Add event listeners
    work.addEventListener('pointerdown', handlePointerDown);
    work.addEventListener('pointermove', handlePointerMove);
    work.addEventListener('pointerup', handlePointerUp);
    work.addEventListener('pointercancel', handlePointerUp);
    
    console.log('✅ Basic drag fallback initialized');
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

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    invitationApp.initialize();
  });
} else {
  invitationApp.initialize();
}

export { invitationApp };