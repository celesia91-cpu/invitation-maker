// responsive-manager.js - Handles responsive scaling and layout management

import { workSize } from './utils.js';

/**
 * Manages responsive scaling and layout adjustments
 * Handles work area resizing, element scaling, and responsive UI changes
 */
export class ResponsiveManager {
  constructor() {
    this.isInitialized = false;
    this.lastWorkWidth = null;
    this.resizeSaveTimer = null;
    this.resizeObserver = null;
    
    // Bind methods to preserve context
    this.handleWorkResize = this.handleWorkResize.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
  }

  /**
   * Initialize responsive manager
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('ResponsiveManager already initialized');
      return;
    }

    try {
      this.setupResizeObserver();
      this.setupWindowResizeHandler();
      this.initializeWorkWidth();
      this.setupOrientationHandling();

      this.isInitialized = true;
      console.log('✅ ResponsiveManager initialized');
      await this.forceLandscape();
      
    } catch (error) {
      console.error('❌ Failed to initialize ResponsiveManager:', error);
      throw error;
    }
  }

  /**
   * Setup ResizeObserver for work area
   */
  setupResizeObserver() {
    const work = document.getElementById('work');
    if (!work) {
      console.warn('Work element not found for resize observer');
      return;
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === work) {
          this.handleWorkResize();
        }
      }
    });

    this.resizeObserver.observe(work);
  }

  /**
   * Setup window resize handler
   */
  setupWindowResizeHandler() {
    window.addEventListener('resize', this.handleWindowResize);
  }

  /**
   * Initialize work width tracking
  */
  initializeWorkWidth() {
    const { w } = workSize();
    if (w > 0) {
      this.lastWorkWidth = w;
      console.log('📐 Initial work width:', w);
    } else {
      console.warn('Work element not found or has zero width');
      this.lastWorkWidth = null;
    }
  }

  /**
   * Handle work area resize with scaling
   */
  handleWorkResize() {
    const { w } = workSize();

    if (w <= 0) return;

    if (!(this.lastWorkWidth > 0)) {
      this.lastWorkWidth = w;
      return;
    }

    const scaleFactor = w / this.lastWorkWidth;
    
    if (Math.abs(scaleFactor - 1) > 0.001) {
      console.log('📐 Work area resized:', { 
        oldWidth: this.lastWorkWidth, 
        newWidth: w, 
        scaleFactor 
      });
      
      this.scaleAllElements(scaleFactor);
      this.lastWorkWidth = w;
      this.scheduleSave();
    }
  }

  /**
   * Handle window resize (for general layout adjustments)
   */
  handleWindowResize() {
    // Could add window resize logic here if needed
    // This is separate from work area resize
    console.log('🖥️ Window resized:', { 
      width: window.innerWidth, 
      height: window.innerHeight 
    });
  }

  /**
   * Scale all elements proportionally
   */
  scaleAllElements(factor) {
    if (!isFinite(factor) || Math.abs(factor - 1) < 0.0001) {
      return;
    }

    console.log('🔄 Scaling all elements by factor:', factor);

    this.scaleTextLayers(factor);
    this.scaleImageElements(factor);
    this.syncToolbarAfterScaling();
  }

  /**
   * Scale all text layers
   */
  scaleTextLayers(factor) {
    const work = document.getElementById('work');
    if (!work) return;

    const textLayers = work.querySelectorAll('.layer');
    
    textLayers.forEach(element => {
      try {
        // Scale position
        const left = parseFloat(element.style.left || '0');
        const top = parseFloat(element.style.top || '0');
        element.style.left = (left * factor) + 'px';
        element.style.top = (top * factor) + 'px';
        
        // Scale width if set
        const width = element.style.width ? parseFloat(element.style.width) : null;
        if (width != null && !Number.isNaN(width)) {
          element.style.width = (width * factor) + 'px';
        }
        
        // Scale font size
        const computedStyle = getComputedStyle(element);
        const fontSize = parseFloat(computedStyle.fontSize) || 28;
        element.style.fontSize = (fontSize * factor) + 'px';
        
      } catch (error) {
        console.warn('Failed to scale text layer:', error);
      }
    });
  }

  /**
   * Scale image elements
   */
  async scaleImageElements(factor) {
    try {
      const { imgState, setTransforms } = await import('./image-manager.js');
      
      if (imgState.has) {
        imgState.cx *= factor;
        imgState.cy *= factor;
        imgState.scale = Math.max(0.05, imgState.scale * factor);
        setTransforms();
      }
      
    } catch (error) {
      console.warn('Failed to scale image elements:', error);
    }
  }

  /**
   * Sync toolbar after scaling
   */
  async syncToolbarAfterScaling() {
    try {
      const { syncToolbarFromActive } = await import('./text-manager.js');
      syncToolbarFromActive();
    } catch (error) {
      console.warn('Failed to sync toolbar after scaling:', error);
    }
  }

  /**
   * Schedule save after resize
   */
  scheduleSave() {
    clearTimeout(this.resizeSaveTimer);
    
    this.resizeSaveTimer = setTimeout(async () => {
      try {
        // Check if we're in purchased design mode
        if (window.invitationApp?.getManager('purchasedDesign')?.isInitialized) {
          const purchasedDesignManager = window.invitationApp.getManager('purchasedDesign');
          await purchasedDesignManager.saveCustomization();
        } else {
          const { saveProjectDebounced } = await import('./state-manager.js');
          saveProjectDebounced();
        }
      } catch (error) {
        console.warn('Failed to save after resize:', error);
      }
    }, 400);
  }

  /**
   * Manually trigger scaling (for testing or special cases)
   */
  scaleBy(factor) {
    if (!this.isInitialized) {
      console.warn('ResponsiveManager not initialized');
      return;
    }
    
    this.scaleAllElements(factor);
  }

  /**
   * Reset to natural size
   */
  resetScaling() {
    if (!this.isInitialized) {
      console.warn('ResponsiveManager not initialized');
      return;
    }

    const { w } = workSize();
    if (this.lastWorkWidth > 0 && w > 0) {
      const resetFactor = 1 / (w / this.lastWorkWidth);
      this.scaleAllElements(resetFactor);
      this.lastWorkWidth = w;
    }
  }

  /**
   * Get current work dimensions
   */
  getCurrentWorkSize() {
    return workSize();
  }

  /**
   * Set last work width (useful for initialization)
   */
  setLastWorkWidth(width) {
    if (width > 0) {
      this.lastWorkWidth = width;
    }
  }

  /**
   * Get current scale factor since last resize
   */
  getCurrentScaleFactor() {
    const { w } = workSize();
    if (this.lastWorkWidth > 0 && w > 0) {
      return w / this.lastWorkWidth;
    }
    return 1;
  }

  /**
   * Check if scaling would occur
   */
  wouldScale() {
    const scaleFactor = this.getCurrentScaleFactor();
    return Math.abs(scaleFactor - 1) > 0.001;
  }

  /**
   * Force a resize check (useful after DOM changes)
   */
  forceResizeCheck() {
    if (this.resizeObserver) {
      // Disconnect and reconnect to trigger observation
      const work = document.getElementById('work');
      if (work) {
        this.resizeObserver.disconnect();
        this.resizeObserver.observe(work);
      }
    }
    
    // Also manually trigger resize check
    setTimeout(() => {
      this.handleWorkResize();
    }, 0);
  }

  /**
   * Get responsive state info
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      lastWorkWidth: this.lastWorkWidth,
      currentWorkSize: this.getCurrentWorkSize(),
      scaleFactor: this.getCurrentScaleFactor(),
      wouldScale: this.wouldScale(),
      hasResizeObserver: !!this.resizeObserver
    };
  }

  /**
   * Add responsive breakpoint handling
   */
  checkBreakpoints() {
    const width = window.innerWidth;
    const work = document.getElementById('work');
    
    if (!work) return;
    
    // Add breakpoint classes to work element
    work.classList.toggle('mobile', width < 768);
    work.classList.toggle('tablet', width >= 768 && width < 1024);
    work.classList.toggle('desktop', width >= 1024);
    
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024
    };
  }

  /**
   * Attempt to lock orientation to landscape on mobile/tablet
   */
  async forceLandscape() {
    const { isMobile, isTablet } = this.checkBreakpoints();
    const overlay = document.getElementById('rotateOverlay');
    if ((isMobile || isTablet) && screen.orientation?.lock) {
      try {
        await screen.orientation.lock('landscape');
        overlay?.classList.remove('show');
      } catch (err) {
        console.warn('Orientation lock failed', err);
      }
    } else if ((isMobile || isTablet) && overlay) {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      overlay.classList.toggle('show', !isLandscape);
    }
  }

  /**
   * Handle orientation changes (mobile)
   */
  handleOrientationChange() {
    this.forceLandscape();
    if ('orientation' in screen) {
      const orientation = screen.orientation?.angle;
      console.log('📱 Orientation changed:', orientation);

      // Force resize check after orientation change
      setTimeout(() => {
        this.forceResizeCheck();
      }, 100);
    }
  }

  /**
   * Setup orientation change handling
   */
  setupOrientationHandling() {
    if ('orientation' in screen) {
      screen.orientation?.addEventListener('change', () => {
        this.handleOrientationChange();
      });
    }
    
    // Fallback for older browsers
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });
  }

  /**
   * Cleanup method
   */
  cleanup() {
    console.log('🧹 Cleaning up ResponsiveManager...');
    
    // Clear timers
    if (this.resizeSaveTimer) {
      clearTimeout(this.resizeSaveTimer);
      this.resizeSaveTimer = null;
    }
    
    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Remove window resize handler
    window.removeEventListener('resize', this.handleWindowResize);
    
    // Reset state
    this.lastWorkWidth = null;
    this.isInitialized = false;
    
    console.log('✅ ResponsiveManager cleaned up');
  }
}