// drag-handlers.js - Enhanced version combining both implementations

/**
 * Enhanced Drag Handlers Manager
 * Combines robust error handling with context-based drag operations
 * Features: image transforms, text positioning/resizing, snap guides, touch support
 */
export class DragHandlersManager {
  constructor() {
    this.isInitialized = false;
    this.dragState = null;
    this.capturedPointerId = null;
    this.preventNextClick = false;
    
    // Context object for operations (similar to provided code)
    this.ctx = null;
    
    // Drag modes from provided code
    this.dragMode = null; // 'move' | 'scale' | 'rotate'
    this.start = {};
    this.dragText = null;

    // Bind methods to preserve context
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    this.handleWorkClick = this.handleWorkClick.bind(this);
    this.handleEscapeKey = this.handleEscapeKey.bind(this);

    // Background box handlers
    this._onBgBoxDown = this._onBgBoxDown.bind(this);
    this._onBgBoxMove = this._onBgBoxMove.bind(this);
    this._onBgBoxUp = this._onBgBoxUp.bind(this);

    // Text handlers
    this._onTextDown = this._onTextDown.bind(this);
    this._onWorkMove = this._onWorkMove.bind(this);
    this._onWorkUp = this._onWorkUp.bind(this);

    // Touch handler references
    this.boundTouchStart = null;
    this.boundTouchMove = null;
    this.lastTap = 0;
  }

  /**
   * Initialize with context object
   */
  initialize(ctx) {
    if (this.isInitialized) {
      console.warn('DragHandlersManager already initialized');
      return;
    }

    this.ctx = ctx || {};
    
    try {
      this.setupWorkAreaHandlers();
      this.setupBackgroundHandlers();
      this.setupTouchHandlers();
      this.setupGlobalHandlers();
      
      this.isInitialized = true;
      console.log('✅ Enhanced DragHandlersManager initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize DragHandlersManager:', error);
      throw error;
    }
  }

  /**
   * Setup background image handlers (from provided code)
   */
  setupBackgroundHandlers() {
    const bgBox = this.ctx.bgBox || document.getElementById('bgBox');
    if (!bgBox) {
      console.warn('Background box element not found');
      return;
    }

    bgBox.addEventListener('pointerdown', this._onBgBoxDown);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => {
      bgBox.addEventListener(ev, this._onBgBoxUp, { passive: true });
    });
  }

  /**
   * Background box pointer down (adapted from provided code)
   */
  _onBgBoxDown(e) {
    const bgBox = this.ctx.bgBox || document.getElementById('bgBox');
    const imgState = this.ctx.imgState;
    const getLocked = this.ctx.getLocked;
    
    if (!imgState?.has || (getLocked && getLocked())) return;
    
    e.preventDefault();
    this.capturePointer(e, bgBox);

    const p = this._getPoint(e);
    const handle = e.target.dataset.handle;

    if (handle === 'rotate') {
      this.dragMode = 'rotate';
      this.start = {
        angle0: imgState.angle,
        a0: Math.atan2(p.y - imgState.cy, p.x - imgState.cx)
      };
    } else if (handle) {
      this.dragMode = 'scale';
      this.start = {
        scale0: imgState.scale,
        d0: Math.hypot(p.x - imgState.cx, p.y - imgState.cy)
      };
    } else {
      this.dragMode = 'move';
      this.start = {
        cx0: imgState.cx,
        cy0: imgState.cy,
        px: p.x,
        py: p.y
      };
    }

    bgBox.addEventListener('pointermove', this._onBgBoxMove);
    console.log(`🖼️ Started background ${this.dragMode} operation`);
  }

  /**
   * Background box pointer move with snap guides
   */
  _onBgBoxMove(e) {
    const imgState = this.ctx.imgState;
    const enforceImageBounds = this.ctx.enforceImageBounds;
    const setTransforms = this.ctx.setTransforms;
    const showGuides = this.ctx.showGuides;
    const work = this.ctx.work || document.getElementById('work');
    
    if (!this.dragMode || !imgState) return;

    const p = this._getPoint(e);
    const r = work.getBoundingClientRect();
    const centerX = r.width / 2;
    const centerY = r.height / 2;

    if (this.dragMode === 'move') {
      const dx = p.x - this.start.px;
      const dy = p.y - this.start.py;
      let newCx = this.start.cx0 + dx;
      let newCy = this.start.cy0 + dy;

      // Snap to center with guides
      let snapV = false, snapH = false;
      if (Math.abs(newCx - centerX) <= 8) {
        newCx = centerX;
        snapV = true;
      }
      if (Math.abs(newCy - centerY) <= 8) {
        newCy = centerY;
        snapH = true;
      }

      imgState.cx = newCx;
      imgState.cy = newCy;
      
      if (enforceImageBounds) enforceImageBounds();
      if (setTransforms) setTransforms();
      if (showGuides) showGuides({ v: snapV, h: snapH });
      
    } else if (this.dragMode === 'scale') {
      const d = Math.hypot(p.x - imgState.cx, p.y - imgState.cy);
      const k = d / Math.max(1, this.start.d0);
      imgState.scale = Math.max(0.05, this.start.scale0 * k);
      
      if (enforceImageBounds) enforceImageBounds();
      if (setTransforms) setTransforms();
      
    } else if (this.dragMode === 'rotate') {
      const a = Math.atan2(p.y - imgState.cy, p.x - imgState.cx);
      imgState.angle = this.start.angle0 + (a - this.start.a0);
      
      if (enforceImageBounds) enforceImageBounds();
      if (setTransforms) setTransforms();
    }
  }

  /**
   * Background box pointer up
   */
  _onBgBoxUp() {
    const bgBox = this.ctx.bgBox || document.getElementById('bgBox');
    const writeCurrentSlide = this.ctx.writeCurrentSlide;
    const saveProjectDebounced = this.ctx.saveProjectDebounced;
    const hideGuides = this.ctx.hideGuides;
    
    this.dragMode = null;
    bgBox.removeEventListener('pointermove', this._onBgBoxMove);
    
    if (writeCurrentSlide) writeCurrentSlide();
    if (saveProjectDebounced) saveProjectDebounced();
    if (hideGuides) hideGuides();
    
    console.log('🖼️ Ended background operation');
  }

  /**
   * Attach text drag handlers to element
   */
  attachText(el) {
    if (!el) return;
    el.addEventListener('pointerdown', this._onTextDown);
  }

  /**
   * Text element pointer down
   */
  _onTextDown(e) {
    const getLocked = this.ctx.getLocked;
    const setActiveLayer = this.ctx.setActiveLayer;
    
    if (getLocked && getLocked()) return;

    const t = e.currentTarget;
    if (setActiveLayer) setActiveLayer(t);
    
    this.dragText = {
      t,
      x: e.clientX,
      y: e.clientY,
      left: parseFloat(t.style.left || '0'),
      top: parseFloat(t.style.top || '0'),
      w: t.offsetWidth,
      h: t.offsetHeight
    };
    
    this.capturePointer(e, t);
    console.log('📝 Started text drag operation');
  }

  /**
   * Setup work area handlers
   */
  setupWorkAreaHandlers() {
    const work = this.ctx.work || document.getElementById('work');
    if (!work) {
      console.warn('Work element not found for drag handlers');
      return;
    }

    // Enhanced pointer handlers
    work.addEventListener('pointerdown', this.handlePointerDown);
    work.addEventListener('pointermove', this._onWorkMove);
    work.addEventListener('pointerup', this._onWorkUp);
    work.addEventListener('pointercancel', this.handlePointerCancel);
    work.addEventListener('click', this.handleWorkClick);
    
    // Disable text selection during drags
    work.style.userSelect = 'none';
    work.style.webkitUserSelect = 'none';
  }

  /**
   * Work area pointer move (for text dragging and resizing)
   */
  _onWorkMove(e) {
    if (!this.dragText) return;
    
    const work = this.ctx.work || document.getElementById('work');
    const showGuides = this.ctx.showGuides;
    const hideGuides = this.ctx.hideGuides;
    
    const r = work.getBoundingClientRect();
    const centerX = r.width / 2;
    const centerY = r.height / 2;

    if (e.shiftKey) {
      // Resize mode (from provided code)
      const deltaX = e.clientX - this.dragText.x;
      const s = Math.max(20, this.dragText.w + deltaX);
      const left = parseFloat(this.dragText.t.style.left || '0');
      const maxW = r.width - left;
      
      this.dragText.t.style.width = Math.max(20, Math.min(s, maxW)) + 'px';
      if (hideGuides) hideGuides();
      
    } else {
      // Move mode with snap to center
      let newLeft = this.dragText.left + (e.clientX - this.dragText.x);
      let newTop = this.dragText.top + (e.clientY - this.dragText.y);
      const w = this.dragText.t.offsetWidth;
      const h = this.dragText.t.offsetHeight;

      // Constrain to work area
      newLeft = Math.min(Math.max(newLeft, 0), Math.max(0, r.width - w));
      newTop = Math.min(Math.max(newTop, 0), Math.max(0, r.height - h));

      // Snap to center with guides
      const elCx = newLeft + w / 2;
      const elCy = newTop + h / 2;
      let snapV = false, snapH = false;
      
      if (Math.abs(elCx - centerX) <= 8) {
        newLeft = Math.round(centerX - w / 2);
        snapV = true;
      }
      if (Math.abs(elCy - centerY) <= 8) {
        newTop = Math.round(centerY - h / 2);
        snapH = true;
      }

      this.dragText.t.style.left = newLeft + 'px';
      this.dragText.t.style.top = newTop + 'px';
      
      if (showGuides) showGuides({ v: snapV, h: snapH });
    }
  }

  /**
   * Work area pointer up
   */
  _onWorkUp() {
    const writeCurrentSlide = this.ctx.writeCurrentSlide;
    const saveProjectDebounced = this.ctx.saveProjectDebounced;
    const hideGuides = this.ctx.hideGuides;
    
    if (this.dragText) {
      this.dragText = null;
      if (writeCurrentSlide) writeCurrentSlide();
      if (saveProjectDebounced) saveProjectDebounced();
      if (hideGuides) hideGuides();
      console.log('📝 Ended text operation');
    }
  }

  /**
   * Get point coordinates relative to work area
   */
  _getPoint(e) {
    const work = this.ctx.work || document.getElementById('work');
    const r = work.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top
    };
  }

  /**
   * Enhanced pointer down handler
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
   * Start image drag operation (enhanced)
   */
  async startImageDrag(e) {
    try {
      const imgState = this.ctx.imgState;
      
      if (imgState?.has) {
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
        console.log('🖼️ Started enhanced image drag');
      }
    } catch (error) {
      console.error('Failed to start image drag:', error);
      this.forceEndDrag();
    }
  }

  /**
   * Start text layer drag operation (enhanced)
   */
  async startTextDrag(e) {
    try {
      // Use existing text drag logic if available
      if (this.ctx.beginDragText) {
        const success = this.ctx.beginDragText(e);
        if (success) {
          this.dragState = {
            type: 'text',
            startX: e.clientX,
            startY: e.clientY,
            hasMoved: false
          };
          this.capturePointer(e);
          console.log('📝 Started enhanced text drag');
        }
      }
    } catch (error) {
      console.error('Failed to start text drag:', error);
      this.forceEndDrag();
    }
  }

  /**
   * Setup touch handlers for mobile
   */
  setupTouchHandlers() {
    const work = this.ctx.work || document.getElementById('work');
    if (!work || this.boundTouchStart) return;

    this.boundTouchStart = (e) => {
      if (e.touches.length === 1 && this.isDragging()) {
        e.preventDefault();
      }
    };
    
    this.boundTouchMove = (e) => {
      if (this.isDragging()) {
        e.preventDefault();
      }
    };

    work.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    work.addEventListener('touchmove', this.boundTouchMove, { passive: false });
  }

  /**
   * Setup global handlers
   */
  setupGlobalHandlers() {
    document.addEventListener('keydown', this.handleEscapeKey);
    
    window.addEventListener('blur', () => {
      if (this.isDragging()) {
        console.log('🛑 Window lost focus, ending drag');
        this.forceEndDrag();
      }
    });
  }

  /**
   * Handle escape key to cancel drag
   */
  handleEscapeKey(e) {
    if (e.key === 'Escape' && this.isDragging()) {
      console.log('🛑 Escape pressed, canceling drag');
      this.forceEndDrag();
    }
  }

  /**
   * Safely capture pointer
   */
  capturePointer(e, element = null) {
    try {
      const target = element || e.currentTarget;
      if (target && target.setPointerCapture) {
        target.setPointerCapture(e.pointerId);
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
   * Handle pointer move
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
      const imgState = this.ctx.imgState;
      const setTransforms = this.ctx.setTransforms;
      
      if (!imgState || !setTransforms) return;
      
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
      if (this.ctx.handleTextDrag) {
        this.ctx.handleTextDrag(e);
      }
    } catch (error) {
      console.error('Failed to handle text drag move:', error);
      throw error;
    }
  }

  /**
   * Handle pointer up
   */
  async handlePointerUp(e) {
    try {
      this.releasePointer(e);
      
      if (this.dragState?.type === 'image') {
        await this.endImageDrag();
      } else if (this.dragState?.type === 'text') {
        await this.endTextDrag();
      }
      
      this.dragState = null;
      
      // Reset click prevention after delay
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
   * Handle pointer cancel
   */
  async handlePointerCancel(e) {
    await this.handlePointerUp(e);
  }

  /**
   * Handle work area clicks
   */
  handleWorkClick(e) {
    if (this.preventNextClick) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
  }

  /**
   * End image drag operation
   */
  async endImageDrag() {
    if (this.ctx.writeCurrentSlide) this.ctx.writeCurrentSlide();
    if (this.ctx.saveProjectDebounced) this.ctx.saveProjectDebounced();
    if (this.ctx.hideGuides) this.ctx.hideGuides();
  }

  /**
   * End text drag operation
   */
  async endTextDrag() {
    if (this.ctx.endDragText) this.ctx.endDragText();
    if (this.ctx.writeCurrentSlide) this.ctx.writeCurrentSlide();
    if (this.ctx.saveProjectDebounced) this.ctx.saveProjectDebounced();
    if (this.ctx.hideGuides) this.ctx.hideGuides();
  }

  /**
   * Check if currently dragging
   */
  isDragging() {
    return this.dragState !== null || this.dragMode !== null || this.dragText !== null;
  }

  /**
   * Force end any current drag operation
   */
  async forceEndDrag() {
    if (this.isDragging()) {
      console.log('🛑 Force ending drag operation');
      
      try {
        if (this.capturedPointerId) {
          this.capturedPointerId = null;
        }
        
        if (this.dragState?.type === 'image') {
          await this.endImageDrag();
        } else if (this.dragState?.type === 'text') {
          await this.endTextDrag();
        }
        
        this.dragState = null;
        this.dragMode = null;
        this.dragText = null;
        this.preventNextClick = false;
        
      } catch (error) {
        console.error('Error during force end drag:', error);
        this.dragState = null;
        this.dragMode = null;
        this.dragText = null;
      }
    }
  }

  /**
   * Cleanup all event listeners
   */
  cleanup() {
    if (!this.isInitialized) return;

    try {
      const work = this.ctx.work || document.getElementById('work');
      const bgBox = this.ctx.bgBox || document.getElementById('bgBox');

      // Remove work area listeners
      if (work) {
        work.removeEventListener('pointerdown', this.handlePointerDown);
        work.removeEventListener('pointermove', this._onWorkMove);
        work.removeEventListener('pointerup', this._onWorkUp);
        work.removeEventListener('pointercancel', this.handlePointerCancel);
        work.removeEventListener('click', this.handleWorkClick);
        
        if (this.boundTouchStart) {
          work.removeEventListener('touchstart', this.boundTouchStart);
        }
        if (this.boundTouchMove) {
          work.removeEventListener('touchmove', this.boundTouchMove);
        }
      }

      // Remove background box listeners
      if (bgBox) {
        bgBox.removeEventListener('pointerdown', this._onBgBoxDown);
        bgBox.removeEventListener('pointerup', this._onBgBoxUp);
        bgBox.removeEventListener('pointercancel', this._onBgBoxUp);
        bgBox.removeEventListener('lostpointercapture', this._onBgBoxUp);
        bgBox.removeEventListener('pointermove', this._onBgBoxMove);
      }

      // Remove global listeners
      document.removeEventListener('keydown', this.handleEscapeKey);

      this.forceEndDrag();
      this.isInitialized = false;
      
      console.log('✅ DragHandlersManager cleaned up');
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get current state info
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      isDragging: this.isDragging(),
      dragType: this.dragState?.type,
      dragMode: this.dragMode,
      hasText: this.dragText !== null,
      hasMoved: this.dragState?.hasMoved,
      capturedPointerId: this.capturedPointerId
    };
  }
}

// Create singleton instance
export const dragHandlers = new DragHandlersManager();