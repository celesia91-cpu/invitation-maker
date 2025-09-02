// main.js - Clean entry point with proper separation of concerns

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
   * Initialize features common to all modes
   */
  async initializeCommonFeatures() {
    console.log('🔧 Initializing common features...');
    
    // Event handlers
    this.managers.eventHandlers = new EventHandlersManager();
    this.managers.eventHandlers.initialize();
    
    // Drag handlers
    this.managers.dragHandlers = new DragHandlersManager();
    this.managers.dragHandlers.initialize();
    
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
   * Create default project for new users
   */
  async createDefaultProject() {
    await loadSlideIntoDOM({ 
      image: null, 
      layers: [], 
      workSize: workSize(), 
      durationMs: 3000 
    });
    
    addTextLayer("You're invited!");
    this.managers.responsive?.setLastWorkWidth(workSize().w);
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
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = 'Failed to load editor';
    }
    
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
      <p style="margin: 0 0 16px;">Something went wrong loading the app. Please refresh to try again.</p>
      <button onclick="location.reload()" style="
        background: #2563eb; 
        color: white; 
        border: none; 
        padding: 8px 16px; 
        border-radius: 8px; 
        cursor: pointer;
      ">Refresh Page</button>
    `;
    document.body.appendChild(errorCard);
  }

  /**
   * Cleanup method for proper shutdown
   */
  cleanup() {
    console.log('🧹 Cleaning up app...');
    
    Object.values(this.managers).forEach(manager => {
      if (manager && typeof manager.cleanup === 'function') {
        try {
          manager.cleanup();
        } catch (error) {
          console.warn('Error during manager cleanup:', error);
        }
      }
    });
    
    this.isInitialized = false;
  }

  /**
   * Get manager instance (for debugging/testing)
   */
  getManager(name) {
    return this.managers[name];
  }

  /**
   * Check if app is ready
   */
  isReady() {
    return this.isInitialized;
  }
}

// Global app instance
let appInstance = null;

/**
 * Initialize the application
 */
async function initializeApp() {
  if (appInstance) {
    console.warn('App already exists, skipping initialization');
    return appInstance;
  }

  appInstance = new InvitationMakerApp();
  await appInstance.initialize();
  
  // Make available globally for debugging
  if (typeof window !== 'undefined') {
    window.invitationApp = appInstance;
  }
  
  return appInstance;
}

/**
 * Handle page unload
 */
window.addEventListener('beforeunload', () => {
  if (appInstance) {
    appInstance.cleanup();
  }
});

/**
 * Handle page visibility changes
 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && appInstance) {
    // App going to background - could pause non-essential features
    console.log('📱 App went to background');
  } else if (appInstance) {
    // App coming back to foreground
    console.log('📱 App returned to foreground');
  }
});

// Start the app
initializeApp().catch(error => {
  console.error('Failed to start app:', error);
});

// Export for module systems
export { InvitationMakerApp, initializeApp };
export default appInstance;