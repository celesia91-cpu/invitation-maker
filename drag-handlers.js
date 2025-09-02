// drag-handlers.js - Handles all drag and drop interactions

/**
 * Manages all drag interactions for images and text layers
 * Handles image dragging, transform handles, and text layer positioning
 */
export class DragHandlersManager {
  constructor() {
    this.isInitialized = false;
    this.dragState = null;
    
    // Bind methods to preserve context
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleWorkClick = this.handleWorkClick.bind(this);
  }

  /**
   * Initialize drag handlers
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('DragHandlersManager already initialized');
      return;
    }

    try {
      this.setupWorkAreaHandlers();
      this.setupTransformBoxHandlers();
      
      this.isInitialized = true;
      console.log('✅ DragHandlersManager initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize DragHandlersManager:', error);
      throw error;
    }
  }

  /**
   * Setup work area drag handlers
   */
  setupWorkAreaHandlers() {
    const work = document.getElementById('work');
    if (!work) {
      console.warn('Work element not found for drag handlers');
      return;
    }

    work.addEventListener('pointerdown', this.handlePointerDown);
    work.addEventListener('pointermove', this.handlePointerMove);
    work.addEventListener('pointerup', this.handlePointerUp);
    work.addEventListener('click', this.handleWorkClick);
  }

  /**
   * Setup transform box handlers (for image manipulation)
   */
  setupTransformBoxHandlers() {
    const bgBox = document.getElementById('bgBox');
    if (!bgBox) {
      console.warn('Transform box element not found');
      return;
    }

    bgBox.addEventListener('pointerdown', this.handleTransformPointerDown.bind(this));
    bgBox.addEventListener('pointermove', this.handleTransformPointerMove.bind(this));
    bgBox.addEventListener('pointerup', this.handleTransformPointerUp.bind(this));
  }

  /**
   * Handle pointer down on work area
   */
  async handlePointerDown(e) {
    const body = document.body;
    if (body.classList.contains('preview') || body.classList.contains('viewer')) {
      return;
    }

    // Check if this is a background image drag
    if (e.target === e.currentTarget || e.target.closest('#userBgWrap')) {
      await this.startImageDrag(e);
    } else if (e.target.closest('.layer')) {
      await this.startTextDrag(e);
    }
  }

  /**
   * Start image drag operation
   */
  async startImageDrag(e) {
    try {
      const { imgState } = await import('./image-manager.js');
      
      if (imgState.has) {
        e.preventDefault();
        
        this.dragState = {
          type: 'image',
          startX: e.clientX,
          startY: e.clientY,
          startCx: imgState.cx,
          startCy: imgState.cy
        };
        
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
    } catch (error) {
      console.error('Failed to start image drag:', error);
    }
  }

  /**
   * Start text layer drag operation
   */
  async startTextDrag(e) {
    try {
      const { beginDragText } = await import('./text-manager.js');
      beginDragText(e);
    } catch (error) {
      console.error('Failed to start text drag:', error);
    }
  }

  /**
   * Handle pointer move during drag
   */
  async handlePointerMove(e) {
    if (this.dragState?.type === 'image') {
      await this.handleImageDrag(e);
    } else {
      await this.handleTextDragMove(e);
    }
  }

  /**
   * Handle image drag movement
   */
  async handleImageDrag(e) {
    try {
      const { imgState, setTransforms } = await import('./image-manager.js');
      
      const dx = e.clientX - this.dragState.startX;
      const dy = e.clientY - this.dragState.startY;
      
      imgState.cx = this.dragState.startCx + dx;
      imgState.cy = this.dragState.startCy + dy;
      
      setTransforms();
    } catch (error) {
      console.error('Failed to handle image drag:', error);
    }
  }

  /**
   * Handle text drag movement
   */
  async handleTextDragMove(e) {
    try {
      const { handleTextDrag } = await import('./text-manager.js');
      handleTextDrag(e);
    } catch (error) {
      console.error('Failed to handle text drag move:', error);
    }
  }

  /**
   * Handle pointer up (end drag)
   */
  async handlePointerUp(e) {
    if (this.dragState?.type === 'image') {
      await this.endImageDrag();
    } else {
      await this.endTextDrag();
    }
  }

  /**
   * End image drag operation
   */
  async endImageDrag() {
    try {
      this.dragState = null;
      
      const { writeCurrentSlide } = await import('./slide-manager.js');
      writeCurrentSlide();
      
      // Save based on mode
      await this.saveAfterDrag();
      
    } catch (error) {
      console.error('Failed to end image drag:', error);
    }
  }

  /**
   * End text drag operation
   */
  async endTextDrag() {
    try {
      const { endTextDrag } = await import('./text-manager.js');
      endTextDrag();
    } catch (error) {
      console.error('Failed to end text drag:', error);
    }
  }

  /**
   * Handle clicks on work area (for text layer selection)
   */
  async handleWorkClick(e) {
    const body = document.body;
    if (body.classList.contains('preview') || body.classList.contains('viewer')) {
      return;
    }

    const layer = e.target.closest('.layer');
    if (layer) {
      try {
        const { handleSetActiveLayer } = await import('./text-manager.js');
        handleSetActiveLayer(layer);
      } catch (error) {
        console.error('Failed to set active layer:', error);
      }
    }
  }

  /**
   * Handle transform box pointer down
   */
  async handleTransformPointerDown(e) {
    const handle = e.target.closest('.handle');
    if (!handle) return;

    try {
      const { imgState } = await import('./image-manager.js');
      
      if (!imgState.has) return;
      
      e.stopPropagation();
      e.preventDefault();
      
      const handleType = handle.dataset.handle;
      const work = document.getElementById('work');
      const rect = work.getBoundingClientRect();
      
      this.dragState = {
        type: 'handle',
        handleType,
        startX: e.clientX,
        startY: e.clientY,
        startScale: imgState.scale,
        startAngle: imgState.angle,
        centerX: rect.left + imgState.cx,
        centerY: rect.top + imgState.cy
      };
      
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (error) {
      console.error('Failed to start transform drag:', error);
    }
  }

  /**
   * Handle transform box pointer move
   */
  async handleTransformPointerMove(e) {
    if (this.dragState?.type !== 'handle') return;

    try {
      const { imgState, setTransforms } = await import('./image-manager.js');
      
      const dx = e.clientX - this.dragState.startX;
      const dy = e.clientY - this.dragState.startY;
      
      if (this.dragState.handleType === 'rotate') {
        // Rotation handle: calculate angle from center
        const angleRad = Math.atan2(
          e.clientY - this.dragState.centerY, 
          e.clientX - this.dragState.centerX
        );
        imgState.angle = angleRad;
      } else {
        // Scale handles: calculate distance-based scaling
        const distance = Math.sqrt(dx * dx + dy * dy);
        const factor = 1 + (distance * (dx > 0 ? 1 : -1)) / 100;
        imgState.scale = Math.max(0.1, this.dragState.startScale * factor);
      }
      
      setTransforms();
    } catch (error) {
      console.error('Failed to handle transform move:', error);
    }
  }

  /**
   * Handle transform box pointer up
   */
  async handleTransformPointerUp() {
    if (this.dragState?.type === 'handle') {
      try {
        this.dragState = null;
        
        const { writeCurrentSlide } = await import('./slide-manager.js');
        writeCurrentSlide();
        
        await this.saveAfterDrag();
        
      } catch (error) {
        console.error('Failed to end transform drag:', error);
      }
    }
  }

  /**
   * Save after drag operation
   */
  async saveAfterDrag() {
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
      console.warn('Failed to save after drag:', error);
    }
  }

  /**
   * Check if currently dragging
   */
  isDragging() {
    return !!this.dragState;
  }

  /**
   * Get current drag state (for debugging)
   */
  getDragState() {
    return this.dragState;
  }

  /**
   * Force end any current drag operation
   */
  async forceEndDrag() {
    if (this.isDragging()) {
      console.log('🛑 Force ending drag operation');
      
      if (this.dragState.type === 'image' || this.dragState.type === 'handle') {
        await this.endImageDrag();
      } else {
        await this.endTextDrag();
      }
    }
  }

  /**
   * Enable/disable drag interactions
   */
  setEnabled(enabled) {
    const work = document.getElementById('work');
    const bgBox = document.getElementById('bgBox');
    
    if (work) {
      work.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    
    if (bgBox) {
      bgBox.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    
    console.log(`🎯 Drag interactions ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get interaction state info
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      isDragging: this.isDragging(),
      dragType: this.dragState?.type,
      dragHandleType: this.dragState?.handleType
    };
  }

  /**
   * Setup touch-specific handlers for mobile
   */
  setupTouchHandlers() {
    const work = document.getElementById('work');
    if (!work) return;

    // Prevent default touch behaviors that might interfere
    work.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // Single touch - allow drag
        e.preventDefault();
      }
    }, { passive: false });

    work.addEventListener('touchmove', (e) => {
      if (this.isDragging()) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  /**
   * Handle double-tap on mobile
   */
  setupDoubleTapHandler() {
    const work = document.getElementById('work');
    if (!work) return;

    let lastTap = 0;
    
    work.addEventListener('touchend', async (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      
      if (tapLength < 500 && tapLength > 0) {
        // Double tap detected
        const layer = e.target.closest('.layer');
        if (layer) {
          // Double tap on text layer - could trigger editing mode
          console.log('📱 Double tap on text layer');
        }
      }
      
      lastTap = currentTime;
    });
  }

  /**
   * Cleanup method
   */
  cleanup() {
    console.log('🧹 Cleaning up DragHandlersManager...');
    
    // Force end any active drag
    this.forceEndDrag();
    
    // Remove event listeners
    const work = document.getElementById('work');
    if (work) {
      work.removeEventListener('pointerdown', this.handlePointerDown);
      work.removeEventListener('pointermove', this.handlePointerMove);
      work.removeEventListener('pointerup', this.handlePointerUp);
      work.removeEventListener('click', this.handleWorkClick);
    }

    const bgBox = document.getElementById('bgBox');
    if (bgBox) {
      bgBox.removeEventListener('pointerdown', this.handleTransformPointerDown);
      bgBox.removeEventListener('pointermove', this.handleTransformPointerMove);
      bgBox.removeEventListener('pointerup', this.handleTransformPointerUp);
    }
    
    // Reset state
    this.dragState = null;
    this.isInitialized = false;
    
    console.log('✅ DragHandlersManager cleaned up');
  }
}