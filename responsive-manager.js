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
    this.applySafeAreaInsets = this.applySafeAreaInsets.bind(this);
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
      this.applySafeAreaInsets();

      this.isInitialized = true;
      console.log('✅ ResponsiveManager initialized');
      this.updateRotateOverlay();
      
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
   * Get current viewport size using visualViewport when available
   */
  getViewportSize() {
    const vv = window.visualViewport;
    return {
      width: vv?.width || window.innerWidth,
      height: vv?.height || window.innerHeight
    };
  }

  /**
   * Apply safe area insets to the work element
   */
  applySafeAreaInsets() {
    const work = document.getElementById('work');
    if (!work) return;

    const supportsEnv = globalThis.CSS?.supports?.('padding-left: env(safe-area-inset-left)');
    if (supportsEnv) {
      work.style.top = 'env(safe-area-inset-top)';
      work.style.right = 'env(safe-area-inset-right)';
      work.style.bottom = 'env(safe-area-inset-bottom)';
      work.style.left = 'env(safe-area-inset-left)';
    } else if (window.visualViewport) {
      const vv = window.visualViewport;
      const left = vv.offsetLeft;
      const top = vv.offsetTop;
      const right = window.innerWidth - vv.width - left;
      const bottom = window.innerHeight - vv.height - top;
      work.style.left = left + 'px';
      work.style.top = top + 'px';
      work.style.right = right + 'px';
      work.style.bottom = bottom + 'px';
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
    const { width, height } = this.getViewportSize();
    console.log('🖥️ Window resized:', {
      width,
      height
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
    const { width } = this.getViewportSize();
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
   * Toggle rotate overlay based on current orientation
   */
  updateRotateOverlay() {
    const overlay = document.getElementById('rotateOverlay');
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    overlay?.classList.toggle('show', !isLandscape);
  }

  /**
   * Wait until the viewport stops changing size
   */
  waitForViewportStability(callback, delay = 300) {
    let { width, height } = this.getViewportSize();
    let lastChange = performance.now();

    const check = () => {
      const { width: w, height: h } = this.getViewportSize();
      if (w !== width || h !== height) {
        width = w;
        height = h;
        lastChange = performance.now();
      }

      if (performance.now() - lastChange >= delay) {
        callback();
      } else {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
  }

  /**
   * Setup orientation change handling
   */
  setupOrientationHandling() {
    const handleChange = () => {
      this.updateRotateOverlay();
      this.waitForViewportStability(() => {
        this.applySafeAreaInsets();
        this.forceResizeCheck();
      });
    };

    const portrait = window.matchMedia('(orientation: portrait)');
    const landscape = window.matchMedia('(orientation: landscape)');

    portrait.addEventListener('change', handleChange);
    landscape.addEventListener('change', handleChange);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        this.waitForViewportStability(() => {
          this.applySafeAreaInsets();
          this.forceResizeCheck();
        });
      });
    }
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