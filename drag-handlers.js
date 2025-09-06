// drag-handlers.js - FIXED: Complete working drag system with proper error handling

/**
 * Enhanced Drag Handlers Manager
 * Handles image transforms, text positioning/resizing, snap guides, touch support
 */
export class DragHandlersManager {
  constructor() {
    this.isInitialized = false;
    this.dragState = null;
    this.capturedPointerId = null;
    this.preventNextClick = false;
    
    // Context object for operations
    this.ctx = null;
    
    // Drag modes
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
   * FIXED: Initialize with proper context validation
   */
  initialize(ctx) {
    if (this.isInitialized) {
      console.warn('DragHandlersManager already initialized');
      return;
    }

    // Validate and store context
    this.ctx = this.validateContext(ctx || {});
    
    try {
      this.setupWorkAreaHandlers();
      this.setupBackgroundHandlers();
      this.setupTouchHandlers();
      this.setupGlobalHandlers();
      
      this.isInitialized = true;
      console.log('✅ DragHandlersManager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize DragHandlersManager:', error);
      throw error;
    }
  }

  /**
   * FIXED: Validate and provide fallbacks for context
   */
  validateContext(ctx) {
    const defaultContext = {
      // DOM elements
      work: document.getElementById('work'),
      bgBox: document.getElementById('bgBox'),
      userBgWrap: document.getElementById('userBgWrap'),
      
      // Image state and functions
      imgState: { has: false, cx: 0, cy: 0, scale: 1, angle: 0, natW: 0, natH: 0 },
      setTransforms: () => console.warn('setTransforms not available'),
      enforceImageBounds: () => console.warn('enforceImageBounds not available'),
      
      // UI functions
      showGuides: () => {},
      hideGuides: () => {},
      
      // State management
      writeCurrentSlide: () => console.warn('writeCurrentSlide not available'),
      saveProjectDebounced: () => console.warn('saveProjectDebounced not available'),
      
      // Text functions
      setActiveLayer: () => console.warn('setActiveLayer not available'),
      getLocked: () => false,
      
      // Drag helpers
      beginDragText: () => false,
      endDragText: () => {},
      
      // Configuration
      snapThreshold: 8,
      enableSnapping: true,
      enableGuides: true
    };

    // Merge provided context with defaults
    const validatedContext = { ...defaultContext, ...ctx };
    
    // Ensure DOM elements exist
    if (!validatedContext.work) {
      console.error('Work element is required for drag handlers');
      validatedContext.work = document.getElementById('work');
    }
    
    if (!validatedContext.bgBox) {
      console.warn('Background box not found, some features may not work');
      validatedContext.bgBox = document.getElementById('bgBox');
    }

    return validatedContext;
  }

  /**
   * FIXED: Setup work area handlers with comprehensive event handling
   */
  setupWorkAreaHandlers() {
    const work = this.ctx.work;
    if (!work) {
      console.error('Work element not found for drag handlers');
      return;
    }

    // Remove any existing listeners to avoid duplicates
    work.removeEventListener('pointerdown', this.handlePointerDown);
    work.removeEventListener('pointermove', this.handlePointerMove);
    work.removeEventListener('pointerup', this.handlePointerUp);
    work.removeEventListener('pointercancel', this.handlePointerCancel);
    work.removeEventListener('click', this.handleWorkClick);

    // Add enhanced pointer handlers
    work.addEventListener('pointerdown', this.handlePointerDown);
    work.addEventListener('pointermove', this.handlePointerMove);
    work.addEventListener('pointerup', this.handlePointerUp);
    work.addEventListener('pointercancel', this.handlePointerCancel);
    work.addEventListener('click', this.handleWorkClick);
    
    // Disable text selection during drags
    work.style.userSelect = 'none';
    work.style.webkitUserSelect = 'none';
    work.style.touchAction = 'none';
    
    console.log('✅ Work area handlers setup complete');
  }

  /**
   * FIXED: Setup background image handlers with proper validation
   */
  setupBackgroundHandlers() {
    const bgBox = this.ctx.bgBox;
    if (!bgBox) {
      console.warn('Background box element not found');
      return;
    }

    // Remove existing listeners
    bgBox.removeEventListener('pointerdown', this._onBgBoxDown);

    // Add pointer handler
    bgBox.addEventListener('pointerdown', this._onBgBoxDown);
    
    // Add cleanup handlers
    ['pointerup', 'pointermove', 'pointercancel', 'lostpointercapture'].forEach(ev => {
      bgBox.removeEventListener(ev, this._onBgBoxUp);
      bgBox.addEventListener(ev, this._onBgBoxUp, { passive: true });
    });
    
    console.log('✅ Background handlers setup complete');
  }

  /**
   * FIXED: Setup touch handlers for mobile devices
   */
  setupTouchHandlers() {
    const work = this.ctx.work;
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
    work.addEventListener('touchend', this.handlePointerUp);
    
    console.log('✅ Touch handlers setup complete');
  }

  /**
   * Setup global handlers
   */
  setupGlobalHandlers() {
    document.addEventListener('keydown', this.handleEscapeKey);
    
    // Prevent context menu during drag
    document.addEventListener('contextmenu', (e) => {
      if (this.isDragging()) {
        e.preventDefault();
      }
    });
  }

  /**
   * FIXED: Enhanced pointer down handler with proper mode detection
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
      const handle = e.target.closest('.handle');
      const layer = e.target.closest('.layer');
      const bgBox = this.ctx.bgBox;
      const isBackgroundArea = e.target === this.ctx.work || 
                              e.target.closest('#userBgWrap') || 
                              e.target === bgBox;

      if (handle && bgBox && !bgBox.classList.contains('hidden')) {
        // Handle transform operation
        await this.startHandleTransform(e, handle);
      } else if (isBackgroundArea && bgBox && !bgBox.classList.contains('hidden')) {
        // Handle image drag
        await this.startImageDrag(e);
      } else if (layer) {
        // Handle text layer drag
        await this.startTextDrag(e, layer);
      }
    } catch (error) {
      console.error('Failed to handle pointer down:', error);
      this.forceEndDrag();
    }
  }

  /**
   * FIXED: Start image drag operation with validation
   */
  async startImageDrag(e) {
    try {
      const imgState = this.ctx.imgState;
      
      if (!imgState?.has) {
        console.log('No image to drag');
        return;
      }
      
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
      document.body.classList.add('dragging');
      
      console.log('🖼️ Started image drag');
    } catch (error) {
      console.error('Failed to start image drag:', error);
      this.forceEndDrag();
    }
  }

  /**
   * FIXED: Start text layer drag operation
   */
  async startTextDrag(e, layer) {
    try {
      e.preventDefault();
      e.stopPropagation();
      
      // Set as active layer
      if (this.ctx.setActiveLayer) {
        this.ctx.setActiveLayer(layer);
      }
      
      // Try to use context's beginDragText
      let success = false;
      if (this.ctx.beginDragText) {
        success = this.ctx.beginDragText(e);
      }
      
      if (success || !this.ctx.beginDragText) {
        this.dragState = {
          type: 'text',
          element: layer,
          startX: e.clientX,
          startY: e.clientY,
          startLeft: parseFloat(layer.style.left || '0'),
          startTop: parseFloat(layer.style.top || '0'),
          hasMoved: false
        };
        
        this.capturePointer(e);
        document.body.classList.add('dragging');
        layer.classList.add('dragging');
        
        console.log('📝 Started text drag');
      }
    } catch (error) {
      console.error('Failed to start text drag:', error);
      this.forceEndDrag();
    }
  }

  /**
   * FIXED: Start handle transform operation
   */
  async startHandleTransform(e, handle) {
    try {
      const imgState = this.ctx.imgState;
      
      if (!imgState?.has) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const handleType = handle.dataset.handle;
      const work = this.ctx.work;
      const workRect = work.getBoundingClientRect();
      
      this.dragState = {
        type: 'transform',
        handleType,
        startX: e.clientX,
        startY: e.clientY,
        startScale: imgState.scale,
        startAngle: imgState.angle,
        startCx: imgState.cx,
        startCy: imgState.cy,
        centerX: imgState.cx,
        centerY: imgState.cy,
        hasMoved: false
      };
      
      this.capturePointer(e);
      document.body.classList.add('dragging');
      
      console.log(`🔄 Started ${handleType} transform`);
    } catch (error) {
      console.error('Failed to start transform:', error);
      this.forceEndDrag();
    }
  }

  /**
   * FIXED: Enhanced pointer move handler
   */
  async handlePointerMove(e) {
    if (!this.dragState) return;

    const dx = e.clientX - this.dragState.startX;
    const dy = e.clientY - this.dragState.startY;
    
    // Mark as moved if significant movement
    if (!this.dragState.hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      this.dragState.hasMoved = true;
    }

    try {
      if (this.dragState.type === 'image') {
        await this.handleImagePointerMove(e, dx, dy);
      } else if (this.dragState.type === 'text') {
        await this.handleTextPointerMove(e, dx, dy);
      } else if (this.dragState.type === 'transform') {
        await this.handleTransformPointerMove(e, dx, dy);
      }
    } catch (error) {
      console.error('Failed to handle pointer move:', error);
    }
  }

  /**
   * FIXED: Handle image movement with snapping
   */
  async handleImagePointerMove(e, dx, dy) {
    const imgState = this.ctx.imgState;
    const { setTransforms, enforceImageBounds, showGuides } = this.ctx;
    
    if (!imgState) return;

    let newCx = this.dragState.startCx + dx;
    let newCy = this.dragState.startCy + dy;

    // Snap to center with guides
    const work = this.ctx.work;
    const workRect = work.getBoundingClientRect();
    const centerX = workRect.width / 2;
    const centerY = workRect.height / 2;
    const threshold = this.ctx.snapThreshold || 8;

    let snapV = false, snapH = false;
    
    if (this.ctx.enableSnapping) {
      if (Math.abs(newCx - centerX) <= threshold) {
        newCx = centerX;
        snapV = true;
      }
      if (Math.abs(newCy - centerY) <= threshold) {
        newCy = centerY;
        snapH = true;
      }
    }

    imgState.cx = newCx;
    imgState.cy = newCy;
    
    if (enforceImageBounds) enforceImageBounds();
    if (setTransforms) setTransforms();
    if (showGuides && this.ctx.enableGuides) {
      showGuides({ v: snapV, h: snapH });
    }
  }

  /**
   * FIXED: Handle text movement
   */
  async handleTextPointerMove(e, dx, dy) {
    if (!this.dragState.element) return;

    const newLeft = this.dragState.startLeft + dx;
    const newTop = this.dragState.startTop + dy;

    this.dragState.element.style.left = newLeft + 'px';
    this.dragState.element.style.top = newTop + 'px';
  }

  /**
   * FIXED: Handle transform operations (scale/rotate)
   */
  async handleTransformPointerMove(e, dx, dy) {
    const imgState = this.ctx.imgState;
    const { setTransforms, enforceImageBounds } = this.ctx;
    const { handleType, startScale, startAngle, centerX, centerY } = this.dragState;
    
    if (!imgState) return;

    if (handleType === 'rotate') {
      // Calculate rotation
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const startingAngle = Math.atan2(this.dragState.startY - centerY, this.dragState.startX - centerX);
      imgState.angle = startAngle + (currentAngle - startingAngle);
    } else {
      // Calculate scale for corner handles
      const startDistance = Math.hypot(this.dragState.startX - centerX, this.dragState.startY - centerY);
      const currentDistance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      
      if (startDistance > 0) {
        const scaleFactor = currentDistance / startDistance;
        imgState.scale = Math.max(0.1, startScale * scaleFactor);
      }
    }
    
    if (enforceImageBounds) enforceImageBounds();
    if (setTransforms) setTransforms();
  }

  /**
   * FIXED: Enhanced pointer up handler
   */
  async handlePointerUp(e) {
    if (!this.dragState) return;

    try {
      // Clean up drag state
      const wasMoving = this.dragState.hasMoved;
      const dragType = this.dragState.type;
      const element = this.dragState.element;

      // Clean up UI classes
      document.body.classList.remove('dragging');
      
      if (element) {
        element.classList.remove('dragging');
      }

      // End text drag if needed
      if (dragType === 'text' && this.ctx.endDragText) {
        this.ctx.endDragText();
      }

      // Hide guides
      if (this.ctx.hideGuides) {
        this.ctx.hideGuides();
      }

      // Save changes if there was actual movement
      if (wasMoving) {
        setTimeout(() => {
          if (this.ctx.writeCurrentSlide) this.ctx.writeCurrentSlide();
          if (this.ctx.saveProjectDebounced) this.ctx.saveProjectDebounced();
        }, 10);
      }

      // Clear drag state
      this.dragState = null;
      
      // Release pointer capture
      if (this.capturedPointerId !== null) {
        const work = this.ctx.work;
        if (work && work.hasPointerCapture(this.capturedPointerId)) {
          work.releasePointerCapture(this.capturedPointerId);
        }
        this.capturedPointerId = null;
      }

      console.log(`✅ Ended ${dragType} drag operation`);
      
    } catch (error) {
      console.error('Failed to handle pointer up:', error);
      this.forceEndDrag();
    }
  }

  /**
   * Handle pointer cancel
   */
  handlePointerCancel(e) {
    this.handlePointerUp(e);
  }

  /**
   * Handle work area clicks
   */
  handleWorkClick(e) {
    if (this.preventNextClick) {
      e.preventDefault();
      e.stopPropagation();
      this.preventNextClick = false;
      return;
    }
    
    // Clear active layer if clicking on empty space
    if (e.target === this.ctx.work) {
      const layers = document.querySelectorAll('.layer');
      layers.forEach(layer => layer.classList.remove('active'));
    }
  }

  /**
   * Handle escape key
   */
  handleEscapeKey(e) {
    if (e.key === 'Escape' && this.isDragging()) {
      this.forceEndDrag();
    }
  }

  /**
   * Utility: Capture pointer
   */
  capturePointer(e) {
    try {
      const work = this.ctx.work;
      if (work && work.setPointerCapture) {
        work.setPointerCapture(e.pointerId);
        this.capturedPointerId = e.pointerId;
      }
    } catch (error) {
      console.warn('Could not capture pointer:', error);
    }
  }

  /**
   * Utility: Check if currently dragging
   */
  isDragging() {
    return this.dragState !== null;
  }

  /**
   * Utility: Force end drag operation
   */
  forceEndDrag() {
    try {
      document.body.classList.remove('dragging');
      
      if (this.dragState?.element) {
        this.dragState.element.classList.remove('dragging');
      }
      
      if (this.ctx.hideGuides) {
        this.ctx.hideGuides();
      }
      
      if (this.ctx.endDragText) {
        this.ctx.endDragText();
      }
      
      this.dragState = null;
      this.capturedPointerId = null;
      
      console.log('🛑 Forced end drag');
    } catch (error) {
      console.error('Failed to force end drag:', error);
    }
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
    
    this.capturePointer(e);
    console.log('📝 Started text drag operation');
  }

  /**
   * Background box pointer down
   */
  _onBgBoxDown(e) {
    const bgBox = this.ctx.bgBox;
    const imgState = this.ctx.imgState;
    const getLocked = this.ctx.getLocked;
    
    if (!imgState?.has || (getLocked && getLocked())) return;
    
    e.preventDefault();
    this.capturePointer(e);

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
    const work = this.ctx.work;
    
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
    const bgBox = this.ctx.bgBox;
    const writeCurrentSlide = this.ctx.writeCurrentSlide;
    const saveProjectDebounced = this.ctx.saveProjectDebounced;
    const hideGuides = this.ctx.hideGuides;
    
    this.dragMode = null;
    
    if (bgBox) {
      bgBox.removeEventListener('pointermove', this._onBgBoxMove);
    }
    
    if (writeCurrentSlide) writeCurrentSlide();
    if (saveProjectDebounced) saveProjectDebounced();
    if (hideGuides) hideGuides();
    
    console.log('🖼️ Ended background operation');
  }

  /**
   * Get point coordinates relative to work area
   */
  _getPoint(e) {
    const work = this.ctx.work;
    const r = work.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top
    };
  }

  /**
   * Work move handler
   */
  _onWorkMove(e) {
    if (this.dragText) {
      const dx = e.clientX - this.dragText.x;
      const dy = e.clientY - this.dragText.y;
      
      this.dragText.t.style.left = (this.dragText.left + dx) + 'px';
      this.dragText.t.style.top = (this.dragText.top + dy) + 'px';
    }
  }

  /**
   * Work up handler
   */
  _onWorkUp() {
    if (this.dragText) {
      const writeCurrentSlide = this.ctx.writeCurrentSlide;
      const saveProjectDebounced = this.ctx.saveProjectDebounced;
      
      if (writeCurrentSlide) writeCurrentSlide();
      if (saveProjectDebounced) saveProjectDebounced();
      
      this.dragText = null;
    }
  }

  /**
   * Cleanup method
   */
  cleanup() {
    const work = this.ctx?.work;
    
    if (work) {
      work.removeEventListener('pointerdown', this.handlePointerDown);
      work.removeEventListener('pointermove', this.handlePointerMove);
      work.removeEventListener('pointerup', this.handlePointerUp);
      work.removeEventListener('pointercancel', this.handlePointerCancel);
      work.removeEventListener('click', this.handleWorkClick);
      
      if (this.boundTouchStart) {
        work.removeEventListener('touchstart', this.boundTouchStart);
        work.removeEventListener('touchmove', this.boundTouchMove);
        work.removeEventListener('touchend', this.handlePointerUp);
      }
    }
    
    const bgBox = this.ctx?.bgBox;
    if (bgBox) {
      bgBox.removeEventListener('pointerdown', this._onBgBoxDown);
      bgBox.removeEventListener('pointermove', this._onBgBoxMove);
      bgBox.removeEventListener('pointerup', this._onBgBoxUp);
    }
    
    document.removeEventListener('keydown', this.handleEscapeKey);
    
    this.forceEndDrag();
    this.isInitialized = false;
    
    console.log('✅ DragHandlersManager cleanup complete');
  }

  /**
   * Destroy the manager
   */
  destroy() {
    this.cleanup();
  }
}