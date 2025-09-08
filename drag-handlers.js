// drag-handlers.js - COMPLETE FIXED VERSION - Fixes the pointer capture release issue

/**
 * Enhanced Drag Handlers Manager
 * Handles image transforms, text positioning/resizing, snap guides, touch support
 * FIXED: Allows double-click text editing without drag interference
 * FIXED: Properly releases pointer capture to prevent stuck dragging
 */
export class DragHandlersManager {
  constructor() {
    this.isInitialized = false;
    this.dragState = null;
    this.potentialDrag = null; // NEW: For delayed drag activation
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
   * Initialize with proper context validation
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
   * Validate and provide fallbacks for context
   */
  validateContext(ctx) {
    const defaultCtx = {
      work: null,
      bgBox: null,
      userBgWrap: null,
      imgState: null,
      setTransforms: () => {},
      enforceImageBounds: () => {},
      showGuides: () => {},
      hideGuides: () => {},
      writeCurrentSlide: () => {},
      saveProjectDebounced: () => {},
      setActiveLayer: () => {},
      getLocked: () => false,
      beginDragText: () => true,
      endDragText: () => {},
      snapThreshold: 8,
      enableSnapping: true,
      enableGuides: true
    };

    return { ...defaultCtx, ...ctx };
  }

  /**
   * Setup work area handlers with enhanced pointer support
   */
  setupWorkAreaHandlers() {
    const work = this.ctx.work;
    if (!work) {
      console.warn('Work element not found');
      return;
    }

    // Remove existing listeners to prevent duplicates
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
   * Setup background image handlers with proper validation
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

    bgBox.addEventListener('pointermove', this._onBgBoxMove);
    
    // Add cleanup handlers
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => {
      bgBox.removeEventListener(ev, this._onBgBoxUp);
      bgBox.addEventListener(ev, this._onBgBoxUp, { passive: true });
    });
    
    console.log('✅ Background handlers setup complete');
  }

  /**
   * Setup touch handlers for mobile devices
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
        // FIXED: Handle text layer drag with delay for editing
        await this.startTextDrag(e, layer);
      }
    } catch (error) {
      console.error('Failed to handle pointer down:', error);
      this.forceEndDrag();
    }
  }

  /**
   * Start image drag operation with validation
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
   * FIXED: Start text layer drag operation - delayed to allow editing
   */
  async startTextDrag(e, layer) {
    try {
      // DON'T prevent default immediately - let clicks/double-clicks work
      e.stopPropagation();
      
      // Set as active layer first
      if (this.ctx.setActiveLayer) {
        this.ctx.setActiveLayer(layer);
      }
      
      // Store initial drag state but don't start dragging yet
      this.potentialDrag = {
        layer: layer,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: parseFloat(layer.style.left || '0'),
        startTop: parseFloat(layer.style.top || '0'),
        startTime: Date.now(),
        pointerId: e.pointerId
      };
      
      console.log('📝 Prepared for potential text drag');
    } catch (error) {
      console.error('Failed to prepare text drag:', error);
    }
  }

  /**
   * NEW: Activate text drag when threshold is met
   */
  async activateTextDrag(e) {
    if (!this.potentialDrag) return;
    
    const layer = this.potentialDrag.layer;
    
    // Now we actually start dragging
    this.dragState = {
      type: 'text',
      element: layer,
      startX: this.potentialDrag.startX,
      startY: this.potentialDrag.startY,
      startLeft: this.potentialDrag.startLeft,
      startTop: this.potentialDrag.startTop,
      hasMoved: false
    };
    
    // Clear potential drag
    this.potentialDrag = null;
    
    // Now prevent default behavior and capture pointer
    e.preventDefault();
    this.capturePointer(e);
    document.body.classList.add('dragging');
    layer.classList.add('dragging');
    
    // Blur the text to stop editing during drag
    if (document.activeElement === layer) {
      layer.blur();
    }
    
    // Call context's beginDragText if available
    if (this.ctx.beginDragText) {
      this.ctx.beginDragText(e);
    }
    
    console.log('🚀 Activated text drag');
  }

  /**
   * Start handle transform operation with vector tracking
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
      
      // Calculate initial vector for sign tracking
      const startVectorX = e.clientX - imgState.cx;
      const startVectorY = e.clientY - imgState.cy;
      
      this.dragState = {
        type: 'transform',
        handleType,
        startX: e.clientX,
        startY: e.clientY,
        startScale: imgState.scale,
        startAngle: imgState.angle,
        startShearX: imgState.shearX || 0,
        startShearY: imgState.shearY || 0,
        startCx: imgState.cx,
        startCy: imgState.cy,
        centerX: imgState.cx,
        centerY: imgState.cy,
        startVectorX,
        startVectorY,
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
   * FIXED: Enhanced pointer move handler with drag threshold
   */
  async handlePointerMove(e) {
    // Handle potential text drag activation
    if (this.potentialDrag && !this.dragState) {
      const dx = e.clientX - this.potentialDrag.startX;
      const dy = e.clientY - this.potentialDrag.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const timeElapsed = Date.now() - this.potentialDrag.startTime;
      
      // Start actual drag if moved enough distance OR held down long enough
      if (distance > 5 || timeElapsed > 150) {
        await this.activateTextDrag(e);
      }
    }
    
    // Continue with existing move logic
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
   * Handle image movement with snapping
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
   * Handle text movement
   */
  async handleTextPointerMove(e, dx, dy) {
    if (!this.dragState.element) return;

    const { showGuides, hideGuides } = this.ctx;
    const element = this.dragState.element;

    let newLeft = this.dragState.startLeft + dx;
    let newTop = this.dragState.startTop + dy;

    const work = this.ctx.work;
    const workRect = work.getBoundingClientRect();
    const centerX = workRect.width / 2;
    const centerY = workRect.height / 2;
    const threshold = this.ctx.snapThreshold || 8;

    let snapV = false, snapH = false;

    if (this.ctx.enableSnapping) {
      const elemWidth = element.offsetWidth;
      const elemHeight = element.offsetHeight;
      const elemCenterX = newLeft + elemWidth / 2;
      const elemCenterY = newTop + elemHeight / 2;

      if (Math.abs(elemCenterX - centerX) <= threshold) {
        newLeft = centerX - elemWidth / 2;
        snapV = true;
      }
      if (Math.abs(elemCenterY - centerY) <= threshold) {
        newTop = centerY - elemHeight / 2;
        snapH = true;
      }
    }

    element.style.left = newLeft + 'px';
    element.style.top = newTop + 'px';

    if (this.ctx.enableGuides && showGuides && (snapV || snapH)) {
      showGuides({ v: snapV, h: snapH });
    } else if (hideGuides) {
      hideGuides();
    }
  }

  /**
   * Handle transform operations
   */
  async handleTransformPointerMove(e, dx, dy) {
    const imgState = this.ctx.imgState;
    const { setTransforms, enforceImageBounds } = this.ctx;
    
    if (!imgState || !this.dragState) return;

    const handleType = this.dragState.handleType;
    const centerX = this.dragState.centerX;
    const centerY = this.dragState.centerY;

    if (handleType === 'rotate') {
      // Rotation logic
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const startAngle = Math.atan2(this.dragState.startY - centerY, this.dragState.startX - centerX);
      const deltaAngle = angle - startAngle;

      imgState.angle = this.dragState.startAngle + deltaAngle;
    } else if (['nw', 'ne', 'se', 'sw'].includes(handleType)) {
      if (e.shiftKey) {
        // Shear instead of scale
        const deltaX = e.clientX - this.dragState.startX;
        const deltaY = e.clientY - this.dragState.startY;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          imgState.shearX = this.dragState.startShearX + deltaX / 100;
        } else {
          imgState.shearY = this.dragState.startShearY + deltaY / 100;
        }
      } else {
        // Scale logic
        const startDistance = Math.sqrt(
          Math.pow(this.dragState.startX - centerX, 2) +
          Math.pow(this.dragState.startY - centerY, 2)
        );
        const currentDistance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) +
          Math.pow(e.clientY - centerY, 2)
        );

        if (startDistance > 0) {
          const scaleFactor = currentDistance / startDistance;
          imgState.scale = Math.max(0.1, this.dragState.startScale * scaleFactor);

          // Update sign tracking for proper scaling direction
          const startVectorX = this.dragState.startVectorX;
          const startVectorY = this.dragState.startVectorY;

          if (startVectorX !== 0 && startVectorY !== 0) {
            const relX = e.clientX - centerX;
            const relY = e.clientY - centerY;
            imgState.signX = relX * startVectorX < 0 ? -1 : 1;
            imgState.signY = relY * startVectorY < 0 ? -1 : 1;
          }
        }
      }
    }

    if (enforceImageBounds) enforceImageBounds();
    if (setTransforms) setTransforms();
  }

  /**
   * FIXED: Enhanced pointer up handler
   */
  async handlePointerUp(e) {
    // Clear potential drag if it never activated
    if (this.potentialDrag) {
      console.log('👆 Cleared potential drag - allowing click/double-click');
      this.potentialDrag = null;
      return; // Let the natural click events proceed
    }
    
    if (!this.dragState) return;

    try {
      const ctx = this.ctx || {};
      const wasMoving = this.dragState.hasMoved;
      const dragType = this.dragState.type;
      const element = this.dragState.element;

      // Clean up UI classes
      document.body?.classList?.remove?.('dragging');
      
      if (element) {
        element.classList.remove('dragging');
      }

      // End text drag if needed
      if (dragType === 'text' && this.ctx.endDragText) {
        this.ctx.endDragText();
      }

      // Hide guides
      if (ctx.hideGuides) {
        ctx.hideGuides();
      }

      // Save changes if there was actual movement
      if (wasMoving) {
        setTimeout(() => {
          if (ctx.writeCurrentSlide) ctx.writeCurrentSlide();
          if (ctx.saveProjectDebounced) ctx.saveProjectDebounced();
        }, 10);
      }

      // Clear drag state
      this.dragState = null;

      // FIXED: Release pointer capture properly
      if (this.capturedPointerId !== null) {
        const work = ctx.work;
        if (work && work.releasePointerCapture) {
          try {
            work.releasePointerCapture(this.capturedPointerId);
          } catch (error) {
            // Ignore errors - pointer might already be released
            console.warn('Could not release pointer capture:', error);
          }
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
    if (e.key === 'Escape') {
      if (this.isDragging()) {
        this.forceEndDrag();
      } else if (this.potentialDrag) {
        this.potentialDrag = null;
        console.log('🔄 Cancelled potential drag');
      }
    }
  }

  /**
   * Cleanup event listeners
   */
  cleanup() {
    const work = this.ctx.work;
    const bgBox = this.ctx.bgBox;

    if (work) {
      work.removeEventListener('pointerdown', this.handlePointerDown);
      work.removeEventListener('pointermove', this.handlePointerMove);
      work.removeEventListener('pointerup', this.handlePointerUp);
      work.removeEventListener('pointercancel', this.handlePointerCancel);
      work.removeEventListener('click', this.handleWorkClick);
      work.removeEventListener('touchstart', this.boundTouchStart);
      work.removeEventListener('touchmove', this.boundTouchMove);
      work.removeEventListener('touchend', this.handlePointerUp);
    }

    if (bgBox) {
      bgBox.removeEventListener('pointerdown', this._onBgBoxDown);
      bgBox.removeEventListener('pointermove', this._onBgBoxMove);
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => {
        bgBox.removeEventListener(ev, this._onBgBoxUp);
      });
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
   * FIXED: Force end drag operation with proper pointer capture release
   */
  forceEndDrag() {
    try {
      document.body?.classList?.remove?.('dragging');

      if (this.dragState?.element?.classList) {
        this.dragState.element.classList.remove('dragging');
      }

      if (this.ctx.hideGuides) {
        this.ctx.hideGuides();
      }

      if (this.ctx.endDragText) {
        this.ctx.endDragText();
      }
      
      // CRITICAL FIX: Release pointer capture before clearing the ID
      if (this.capturedPointerId !== null) {
        const work = this.ctx.work;
        if (work && work.releasePointerCapture) {
          try {
            work.releasePointerCapture(this.capturedPointerId);
          } catch (error) {
            console.warn('Could not force release pointer capture:', error);
          }
        }
      }
      
      this.dragState = null;
      this.potentialDrag = null;
      this.capturedPointerId = null;
      
      console.log('🛑 Forced end drag - with pointer capture release');
    } catch (error) {
      console.error('Failed to force end drag:', error);
    }
  }

  /**
   * Attach text drag handlers to element
   */
  attachText(el) {
    if (!el || el.dataset?.editing === 'true') return;
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
    if (t.dataset?.editing === 'true') return;
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
      if (['nw', 'ne', 'se', 'sw'].includes(handle)) {
        this.dragMode = 'scale';
        this.start = {
          scale0: imgState.scale,
          cx: imgState.cx,
          cy: imgState.cy,
          dist0: Math.sqrt(Math.pow(p.x - imgState.cx, 2) + Math.pow(p.y - imgState.cy, 2))
        };
      }
    } else {
      this.dragMode = 'move';
      this.start = {
        cx0: imgState.cx,
        cy0: imgState.cy,
        x0: p.x,
        y0: p.y
      };
    }
    
    console.log(`🎯 Background drag mode: ${this.dragMode}`);
  }

  /**
   * FIXED: Background box pointer up - now properly releases pointer capture
   */
  _onBgBoxUp(e) {
    if (this.dragMode) {
      console.log(`✅ Ended background ${this.dragMode} operation`);
      this.dragMode = null;
      this.start = {};
      
      // CRITICAL FIX: Release pointer capture
      if (this.capturedPointerId !== null) {
        const work = this.ctx.work;
        if (work && work.releasePointerCapture) {
          try {
            work.releasePointerCapture(this.capturedPointerId);
          } catch (error) {
            console.warn('Could not release pointer capture in bgBox:', error);
          }
        }
        this.capturedPointerId = null;
      }
    }
  }

  _onBgBoxMove(e) {
    const imgState = this.ctx.imgState;
    const { setTransforms, enforceImageBounds } = this.ctx;
    
    if (!this.dragMode || !imgState) return;
    
    const p = this._getPoint(e);
    
    if (this.dragMode === 'move') {
      const dx = p.x - this.start.x0;
      const dy = p.y - this.start.y0;
      imgState.cx = this.start.cx0 + dx;
      imgState.cy = this.start.cy0 + dy;
    } else if (this.dragMode === 'scale') {
      const dist = Math.sqrt(Math.pow(p.x - this.start.cx, 2) + Math.pow(p.y - this.start.cy, 2));
      if (this.start.dist0 > 0) {
        imgState.scale = this.start.scale0 * (dist / this.start.dist0);
      }
    } else if (this.dragMode === 'rotate') {
      const angle = Math.atan2(p.y - imgState.cy, p.x - imgState.cx);
      imgState.angle = this.start.angle0 + (angle - this.start.a0);
    }
    
    if (enforceImageBounds) enforceImageBounds();
    if (setTransforms) setTransforms();
  }

  /**
   * Get point coordinates relative to work area
   */
  _getPoint(e) {
    const work = this.ctx.work;
    const rect = work.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  /**
   * Work area pointer move
   */
  _onWorkMove(e) {
    if (!this.dragText) return;
    
    const dx = e.clientX - this.dragText.x;
    const dy = e.clientY - this.dragText.y;
    
    this.dragText.t.style.left = (this.dragText.left + dx) + 'px';
    this.dragText.t.style.top = (this.dragText.top + dy) + 'px';
  }

  /**
   * Work area pointer up
   */
  _onWorkUp(e) {
    if (this.dragText) {
      console.log('✅ Ended text drag');
      this.dragText = null;
    }
  }
}