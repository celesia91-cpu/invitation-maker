// drag-handlers.js - Fixed version with improved drag and resize handling

/**
 * Manages all drag interactions for images and text layers
 * Handles image dragging, transform handles, and text layer positioning
 * FIXES: Pointer capture issues, state cleanup, resize boundaries, touch conflicts
 */
export class DragHandlersManager {
  constructor() {
    this.isInitialized = false;
    this.dragState = null;
    this.capturedPointerId = null; // Track pointer capture
    this.preventNextClick = false; // Prevent click after drag

    // Bind methods to preserve context
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    this.handleWorkClick = this.handleWorkClick.bind(this);

    // Store bound transform handlers for add/remove operations
    this.onTransformPointerDown = this.handleTransformPointerDown.bind(this);
    this.onTransformPointerMove = this.handleTransformPointerMove.bind(this);
    this.onTransformPointerUp = this.handleTransformPointerUp.bind(this);
    this.onTransformPointerCancel = this.handleTransformPointerCancel.bind(this);

    // Touch handler references
    this.boundTouchStart = null;
    this.boundTouchMove = null;
    this.boundTouchEnd = null;
    this.lastTap = 0;
    
    // Add global escape key handler for stuck drags
    this.handleEscapeKey = this.handleEscapeKey.bind(this);
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
      this.setupTouchHandlers();
      this.setupDoubleTapHandler();
      this.setupGlobalHandlers();
      
      this.isInitialized = true;
      console.log('✅ DragHandlersManager initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize DragHandlersManager:', error);
      throw error;
    }
  }

  /**
   * Setup global handlers (escape key, etc.)
   */
  setupGlobalHandlers() {
    document.addEventListener('keydown', this.handleEscapeKey);
    
    // Handle lost pointer events (when mouse leaves window)
    window.addEventListener('blur', () => {
      if (this.isDragging()) {
        console.log('🛑 Window lost focus, ending drag');
        this.forceEndDrag();
      }
    });
  }

  /**
   * Handle escape key to cancel any active drag
   */
  handleEscapeKey(e) {
    if (e.key === 'Escape' && this.isDragging()) {
      console.log('🛑 Escape pressed, canceling drag');
      this.forceEndDrag();
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
    work.addEventListener('pointercancel', this.handlePointerCancel);
    work.addEventListener('click', this.handleWorkClick);
    
    // Disable text selection during drags
    work.style.userSelect = 'none';
    work.style.webkitUserSelect = 'none';
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

    bgBox.addEventListener('pointerdown', this.onTransformPointerDown);
    bgBox.addEventListener('pointermove', this.onTransformPointerMove);
    bgBox.addEventListener('pointerup', this.onTransformPointerUp);
    bgBox.addEventListener('pointercancel', this.onTransformPointerCancel);
  }

  /**
   * Handle pointer down on work area
   */
  async handlePointerDown(e) {
    const body = document.body;
    if (body.classList.contains('preview') || body.classList.contains('viewer')) {
      return;
    }

    // Ignore right clicks and multi-touch
    if (e.button !== 0 || this.isDragging()) {
      return;
    }

    try {
      // Check if this is a background image drag
      if (e.target === e.currentTarget || e.target.closest('#userBgWrap')) {
        await this.startImageDrag(e);
      } else if (e.target.closest('.layer')) {
        await this.startTextDrag(e);
      }
    } catch (error) {
      console.error('Failed to handle pointer down:', error);
      this.forceEndDrag();
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
        e.stopPropagation();
        
        this.dragState = {
          type: 'image',
          startX: e.clientX,
          startY: e.clientY,
          startCx: imgState.cx,
          startCy: imgState.cy,
          hasMoved: false
        };
        
        this.capturePointer(e);
        console.log('🖼️ Started image drag');
      }
    } catch (error) {
      console.error('Failed to start image drag:', error);
      this.forceEndDrag();
    }
  }

  /**
   * Start text layer drag operation
   */
  async startTextDrag(e) {
    try {
      const { beginDragText } = await import('./text-manager.js');
      const success = beginDragText(e);
      
      if (success) {
        this.dragState = {
          type: 'text',
          startX: e.clientX,
          startY: e.clientY,
          hasMoved: false
        };
        
        this.capturePointer(e);
        console.log('📝 Started text drag');
      }
    } catch (error) {
      console.error('Failed to start text drag:', error);
      this.forceEndDrag();
    }
  }

  /**
   * Safely capture pointer
   */
  capturePointer(e) {
    try {
      if (e.currentTarget && e.currentTarget.setPointerCapture) {
        e.currentTarget.setPointerCapture(e.pointerId);
        this.capturedPointerId = e.pointerId;
      }
    } catch (error) {
      console.warn('Failed to capture pointer:', error);
    }
  }

  /**
   * Safely release pointer
   */
  releasePointer(e) {
    try {
      if (this.capturedPointerId && e.currentTarget && e.currentTarget.releasePointerCapture) {
        e.currentTarget.releasePointerCapture(this.capturedPointerId);
      }
    } catch (error) {
      console.warn('Failed to release pointer:', error);
    } finally {
      this.capturedPointerId = null;
    }
  }

  /**
   * Handle pointer move during drag
   */
  async handlePointerMove(e) {
    if (!this.isDragging()) return;

    // Mark that movement has occurred
    if (this.dragState) {
      const dx = Math.abs(e.clientX - this.dragState.startX);
      const dy = Math.abs(e.clientY - this.dragState.startY);
      
      if (!this.dragState.hasMoved && (dx > 3 || dy > 3)) {
        this.dragState.hasMoved = true;
        this.preventNextClick = true;
      }
    }

    try {
      if (this.dragState?.type === 'image') {
        await this.handleImageDrag(e);
      } else if (this.dragState?.type === 'text') {
        await this.handleTextDragMove(e);
      }
    } catch (error) {
      console.error('Failed to handle pointer move:', error);
      this.forceEndDrag();
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
      throw error;
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
      throw error;
    }
  }

  /**
   * Handle pointer up (end drag)
   */
  async handlePointerUp(e) {
    try {
      this.releasePointer(e);
      
      if (this.dragState?.type === 'image') {
        await this.endImageDrag();
      } else if (this.dragState?.type === 'handle') {
        await this.handleTransformPointerUp();
      } else if (this.dragState?.type === 'text') {
        await this.endTextDrag();
      }
      
      // Reset click prevention after a brief delay
      if (this.preventNextClick) {
        setTimeout(() => {
          this.preventNextClick = false;
        }, 50);
      }
    } catch (error) {
      console.error('Failed to handle pointer up:', error);
      this.forceEndDrag();
    }
  }

  /**
   * Handle pointer cancel (lost capture, etc.)
   */
  async handlePointerCancel(e) {
    console.log('🛑 Pointer canceled, ending drag');
    this.releasePointer(e);
    await this.forceEndDrag();
  }

  /**
   * End image drag operation
   */
  async endImageDrag() {
    try {
      if (this.dragState?.type === 'image' && this.dragState.hasMoved) {
        const { writeCurrentSlide } = await import('./slide-manager.js');
        writeCurrentSlide();
        await this.saveAfterDrag();
      }
      
      this.dragState = null;
      console.log('✅ Image drag ended');
      
    } catch (error) {
      console.error('Failed to end image drag:', error);
      throw error;
    }
  }

  /**
   * End text drag operation
   */
  async endTextDrag() {
    try {
      const { endTextDrag } = await import('./text-manager.js');
      endTextDrag();
      this.dragState = null;
      console.log('✅ Text drag ended');
    } catch (error) {
      console.error('Failed to end text drag:', error);
      throw error;
    }
  }

  /**
   * Handle clicks on work area (for text layer selection)
   */
  async handleWorkClick(e) {
    // Prevent click if we just finished dragging
    if (this.preventNextClick) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

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
    if (!handle || this.isDragging()) return;

    try {
      const { imgState } = await import('./image-manager.js');
      
      if (!imgState.has) return;
      
      e.stopPropagation();
      e.preventDefault();
      
      const handleType = handle.dataset.handle;
      const work = document.getElementById('work');
      const rect = work.getBoundingClientRect();
      
      const centerX = rect.left + imgState.cx;
      const centerY = rect.top + imgState.cy;
      const startPointerAngle = Math.atan2(
        e.clientY - centerY,
        e.clientX - centerX
      );
      const startVectorX = e.clientX - centerX;
      const startVectorY = e.clientY - centerY;
      const startDistance = Math.hypot(startVectorX, startVectorY);

      this.dragState = {
        type: 'handle',
        handleType,
        startX: e.clientX,
        startY: e.clientY,
        startScale: imgState.scale,
        startAngle: imgState.angle,
        centerX,
        centerY,
        startPointerAngle,
        startVectorX,
        startVectorY,
        startDistance,
        hasMoved: false
      };
      
      this.capturePointer(e);
      console.log(`🎛️ Started ${handleType} transform`);
      
    } catch (error) {
      console.error('Failed to start transform drag:', error);
      this.forceEndDrag();
    }
  }

  /**
   * Handle transform box pointer move
   */
  async handleTransformPointerMove(e) {
    if (this.dragState?.type !== 'handle') return;

    // Mark movement
    if (!this.dragState.hasMoved) {
      const dx = Math.abs(e.clientX - this.dragState.startX);
      const dy = Math.abs(e.clientY - this.dragState.startY);
      if (dx > 3 || dy > 3) {
        this.dragState.hasMoved = true;
      }
    }

    try {
      const { imgState, setTransforms } = await import('./image-manager.js');
      
      if (this.dragState.handleType === 'rotate') {
        // Rotation handle: calculate angle relative to start
        const currentAngle = Math.atan2(
          e.clientY - this.dragState.centerY,
          e.clientX - this.dragState.centerX
        );
        imgState.angle =
          this.dragState.startAngle +
          currentAngle -
          this.dragState.startPointerAngle;
      } else {
        // Scale handles: scale based on vector from center to pointer
        const currentVectorX = e.clientX - this.dragState.centerX;
        const currentVectorY = e.clientY - this.dragState.centerY;
        const currentDistance = Math.hypot(currentVectorX, currentVectorY);
        
        // Prevent division by zero and ensure minimum scale
        if (this.dragState.startDistance > 0) {
          const factor = currentDistance / this.dragState.startDistance;
          imgState.scale = Math.max(0.1, Math.min(5.0, this.dragState.startScale * factor));
        }

        const sign = v => (v >= 0 ? 1 : -1);
        imgState.signX = sign(currentVectorX) === sign(this.dragState.startVectorX) ? 1 : -1;
        imgState.signY = sign(currentVectorY) === sign(this.dragState.startVectorY) ? 1 : -1;
      }
      
      setTransforms();
    } catch (error) {
      console.error('Failed to handle transform move:', error);
      this.forceEndDrag();
    }
  }

  /**
   * Handle transform box pointer up
   */
  async handleTransformPointerUp() {
    if (this.dragState?.type === 'handle') {
      try {
        this.releasePointer({ currentTarget: document.getElementById('bgBox') });
        
        if (this.dragState.hasMoved) {
          const { writeCurrentSlide } = await import('./slide-manager.js');
          writeCurrentSlide();
          await this.saveAfterDrag();
        }
        
        this.dragState = null;
        console.log('✅ Transform ended');
        
      } catch (error) {
        console.error('Failed to end transform drag:', error);
        this.forceEndDrag();
      }
    }
  }

  /**
   * Handle transform pointer cancel
   */
  async handleTransformPointerCancel() {
    console.log('🛑 Transform pointer canceled');
    this.releasePointer({ currentTarget: document.getElementById('bgBox') });
    await this.forceEndDrag();
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
      
      try {
        // Release any captured pointer
        if (this.capturedPointerId) {
          this.capturedPointerId = null;
        }
        
        if (this.dragState.type === 'image') {
          await this.endImageDrag();
        } else if (this.dragState.type === 'handle') {
          this.dragState = null;
        } else if (this.dragState.type === 'text') {
          await this.endTextDrag();
        }
        
        this.dragState = null;
        this.preventNextClick = false;
        
      } catch (error) {
        console.error('Error during force end drag:', error);
        this.dragState = null;
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
      dragHandleType: this.dragState?.handleType,
      hasMoved: this.dragState?.hasMoved,
      capturedPointerId: this.capturedPointerId
    };
  }

  /**
   * Setup touch-specific handlers for mobile
   */
  setupTouchHandlers() {
    const work = document.getElementById('work');
    if (!work || this.boundTouchStart) return;

    this.boundTouchStart = (e) => {
      // Prevent default only for single touch during drags
      if (e.touches.length === 1 && this.isDragging()) {
        e.preventDefault();
      }
    };
    
    this.boundTouchMove = (e) => {
      // Prevent scrolling during drag operations
      if (this.isDragging()) {
        e.preventDefault();
      }
    };

    work.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    work.addEventListener('touchmove', this.boundTouchMove, { passive: false });
  }

  /**
   * Handle double-tap on mobile
   */
  setupDoubleTapHandler() {
    const work = document.getElementById('work');
    if (!work || this.boundTouchEnd) return;
    this.lastTap = 0;

    this.boundTouchEnd = async (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - this.lastTap;

      if (tapLength < 500 && tapLength > 0) {
        const layer = e.target.closest('.layer');
        if (layer) {
          console.log('📱 Double tap on text layer');
          // You can add double-tap functionality here
        }
      }

      this.lastTap = currentTime;
    };

    work.addEventListener('touchend', this.boundTouchEnd);
  }

  /**
   * Cleanup method
   */
  cleanup() {
    console.log('🧹 Cleaning up DragHandlersManager...');
    
    // Force end any active drag
    this.forceEndDrag();
    
    // Remove global handlers
    document.removeEventListener('keydown', this.handleEscapeKey);
    
    // Remove event listeners
    const work = document.getElementById('work');
    if (work) {
      work.removeEventListener('pointerdown', this.handlePointerDown);
      work.removeEventListener('pointermove', this.handlePointerMove);
      work.removeEventListener('pointerup', this.handlePointerUp);
      work.removeEventListener('pointercancel', this.handlePointerCancel);
      work.removeEventListener('click', this.handleWorkClick);
      
      if (this.boundTouchStart) {
        work.removeEventListener('touchstart', this.boundTouchStart);
        this.boundTouchStart = null;
      }
      if (this.boundTouchMove) {
        work.removeEventListener('touchmove', this.boundTouchMove);
        this.boundTouchMove = null;
      }
      if (this.boundTouchEnd) {
        work.removeEventListener('touchend', this.boundTouchEnd);
        this.boundTouchEnd = null;
      }
    }

    const bgBox = document.getElementById('bgBox');
    if (bgBox) {
      bgBox.removeEventListener('pointerdown', this.onTransformPointerDown);
      bgBox.removeEventListener('pointermove', this.onTransformPointerMove);
      bgBox.removeEventListener('pointerup', this.onTransformPointerUp);
      bgBox.removeEventListener('pointercancel', this.onTransformPointerCancel);
    }
    
    // Reset state
    this.dragState = null;
    this.capturedPointerId = null;
    this.preventNextClick = false;
    this.isInitialized = false;
    this.lastTap = 0;
    
    console.log('✅ DragHandlersManager cleaned up');
  }
}