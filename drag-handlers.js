// drag-handlers.js - Complete implementation with text editing awareness

/**
 * Enhanced Drag Handlers Manager with Text Editing Support
 * Properly handles the distinction between drag mode and edit mode for text layers
 */
export class DragHandlersManager {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.dragState = null;
    this.capturedPointerId = null;
    this.preventNextClick = false;
    
    // Text drag fallback
    this.dragText = null;
    
    // Bound methods for event handling
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    this.handleWorkClick = this.handleWorkClick.bind(this);
    this.handleEscapeKey = this.handleEscapeKey.bind(this);
    this._onTextDown = this._onTextDown.bind(this);
    this._onBgBoxDown = this._onBgBoxDown.bind(this);
    this._onBgBoxMove = this._onBgBoxMove.bind(this);
    this._onBgBoxUp = this._onBgBoxUp.bind(this);
    
    // Touch support
    this.boundTouchStart = null;
    this.boundTouchMove = null;
  }

  /**
   * Initialize drag handlers with context
   */
  initialize(context = {}) {
    if (this.isInitialized) {
      console.warn('DragHandlersManager already initialized');
      return;
    }

    this.ctx = {
      work: null,
      bgBox: null,
      userBgWrap: null,
      imgState: null,
      showGuides: () => {},
      hideGuides: () => {},
      writeCurrentSlide: () => {},
      saveProjectDebounced: () => {},
      setActiveLayer: () => {},
      getLocked: () => false,
      beginDragText: () => false,
      endDragText: () => {},
      // NEW: Text editing functions
      enterTextEditMode: () => {},
      exitTextEditMode: () => {},
      isInEditMode: () => false,
      getEditingElement: () => null,
      snapThreshold: 8,
      enableSnapping: true,
      enableGuides: true,
      ...context
    };

    // Validate required elements
    if (!this.ctx.work) {
      console.error('Work element required for drag handlers');
      return;
    }

    this.setupEventListeners();
    this.isInitialized = true;
    console.log('✅ DragHandlersManager initialized');
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    const { work, bgBox } = this.ctx;

    // Work area events
    if (work) {
      work.addEventListener('pointerdown', this.handlePointerDown);
      work.addEventListener('pointermove', this.handlePointerMove);
      work.addEventListener('pointerup', this.handlePointerUp);
      work.addEventListener('pointercancel', this.handlePointerCancel);
      work.addEventListener('click', this.handleWorkClick);
      
      // Touch support for mobile
      this.boundTouchStart = (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const pointerEvent = new PointerEvent('pointerdown', {
            pointerId: touch.identifier,
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0
          });
          this.handlePointerDown(pointerEvent);
        }
      };
      
      this.boundTouchMove = (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const pointerEvent = new PointerEvent('pointermove', {
            pointerId: touch.identifier,
            clientX: touch.clientX,
            clientY: touch.clientY
          });
          this.handlePointerMove(pointerEvent);
        }
      };
      
      work.addEventListener('touchstart', this.boundTouchStart, { passive: false });
      work.addEventListener('touchmove', this.boundTouchMove, { passive: false });
      work.addEventListener('touchend', this.handlePointerUp);
    }

    // Background box events
    if (bgBox) {
      bgBox.addEventListener('pointerdown', this._onBgBoxDown);
      bgBox.addEventListener('pointermove', this._onBgBoxMove);
      bgBox.addEventListener('pointerup', this._onBgBoxUp);
    }

    // Global escape key
    document.addEventListener('keydown', this.handleEscapeKey);
  }

  /**
   * Main pointer down handler with edit mode awareness
   */
  handlePointerDown(e) {
    if (e.button !== 0) return; // Only handle left mouse button
    
    const body = document.body;
    if (body.classList.contains('preview') || body.classList.contains('viewer')) {
      return;
    }

    // Check if user is in text editing mode
    if (this.ctx.isInEditMode && this.ctx.isInEditMode()) {
      const editingElement = this.ctx.getEditingElement ? this.ctx.getEditingElement() : null;
      
      // If clicking on the editing element, allow text selection
      if (editingElement && (e.target === editingElement || editingElement.contains(e.target))) {
        return; // Let text editing proceed normally
      }
      
      // If clicking elsewhere, exit edit mode
      if (this.ctx.exitTextEditMode) {
        this.ctx.exitTextEditMode();
      }
    }

    const layer = e.target.closest('.layer.text-layer');
    const handle = e.target.closest('.handle');
    const bgBox = this.ctx.bgBox;
    const isImageArea = e.target === this.ctx.work || 
                       e.target.closest('#userBgWrap') || 
                       e.target === bgBox;

    if (layer) {
      this.startTextDrag(e);
    } else if (handle) {
      this.startHandleTransform(e, handle);
    } else if (isImageArea && this.ctx.imgState?.has) {
      this.startImageDrag(e);
    }
  }

  /**
   * Start text layer drag with edit mode checking
   */
  startTextDrag(e) {
    try {
      const layer = e.target.closest('.layer.text-layer');
      if (!layer) return;
      
      // CRITICAL: Don't start drag if in editing mode
      if (layer.dataset.editing === 'true' || layer.contentEditable === 'true') {
        console.log('🚫 Skipping drag - text is in edit mode');
        return;
      }
      
      const getLocked = this.ctx.getLocked;
      if (getLocked && getLocked()) return;
      
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
   * Start image drag
   */
  startImageDrag(e) {
    try {
      const imgState = this.ctx.imgState;
      if (!imgState || !imgState.has) return;
      
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
   * Start handle transform operation
   */
  async startHandleTransform(e, handle) {
    try {
      const imgState = this.ctx.imgState;
      
      if (!imgState?.has) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const handleType = handle.dataset.handle;
      
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
   * Handle pointer move with edit mode awareness
   */
  handlePointerMove(e) {
    if (!this.dragState) return;
    
    // Don't interfere with text editing
    const element = this.dragState.element;
    if (element && (element.dataset.editing === 'true' || element.contentEditable === 'true')) {
      return;
    }
    
    try {
      const { type, startX, startY } = this.dragState;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // Mark as moved if threshold exceeded
      if (!this.dragState.hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        this.dragState.hasMoved = true;
      }
      
      if (type === 'text') {
        this.handleTextDrag(e, dx, dy);
      } else if (type === 'image') {
        this.handleImageDrag(e, dx, dy);
      } else if (type === 'transform') {
        this.handleTransformDrag(e);
      }
      
    } catch (error) {
      console.error('Failed to handle pointer move:', error);
    }
  }

  /**
   * Handle text layer dragging
   */
  handleTextDrag(e, dx, dy) {
    const { element, startLeft, startTop } = this.dragState;
    
    if (element) {
      element.style.left = (startLeft + dx) + 'px';
      element.style.top = (startTop + dy) + 'px';
      
      // Show guides if enabled
      if (this.ctx.enableGuides && this.ctx.showGuides) {
        this.ctx.showGuides();
      }
    }
  }

  /**
   * Handle image dragging
   */
  handleImageDrag(e, dx, dy) {
    const imgState = this.ctx.imgState;
    const { startCx, startCy } = this.dragState;
    
    if (imgState) {
      imgState.cx = startCx + dx;
      imgState.cy = startCy + dy;
      
      if (this.ctx.enforceImageBounds) {
        this.ctx.enforceImageBounds();
      }
      
      if (this.ctx.setTransforms) {
        this.ctx.setTransforms();
      }
    }
  }

  /**
   * Handle transform dragging (scaling/rotation)
   */
  async handleTransformDrag(e) {
    const imgState = this.ctx.imgState;
    const { handleType, centerX, centerY, startScale, startShearX, startShearY } = this.dragState;
    
    if (!imgState) return;
    
    if (handleType === 'rotate') {
      // Rotation logic
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const startAngle = this.dragState.startAngle || 0;
      const deltaAngle = angle - (this.dragState.startPointerAngle || angle);
      imgState.angle = startAngle + deltaAngle * (180 / Math.PI);
    } else if (['nw', 'ne', 'se', 'sw'].includes(handleType)) {
      // Scale/shear logic
      if (e.shiftKey) {
        // Shear mode
        const dx = e.clientX - this.dragState.startX;
        const dy = e.clientY - this.dragState.startY;
        imgState.shearX = startShearX + dx * 0.001;
        imgState.shearY = startShearY + dy * 0.001;
      } else {
        // Scale mode
        const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        const startDistance = this.dragState.startDistance || distance;
        const scaleFactor = distance / (startDistance || 1);
        imgState.scale = Math.max(0.1, startScale * scaleFactor);
        
        // Handle sign changes for flipping
        const currentVectorX = e.clientX - centerX;
        const currentVectorY = e.clientY - centerY;
        
        if (this.dragState.startVectorX * currentVectorX < 0) {
          imgState.signX = -imgState.signX;
          this.dragState.startVectorX = currentVectorX;
        }
        
        if (this.dragState.startVectorY * currentVectorY < 0) {
          imgState.signY = -imgState.signY;
          this.dragState.startVectorY = currentVectorY;
        }
      }
    }
    
    if (this.ctx.setTransforms) {
      this.ctx.setTransforms();
    }
    
    if (this.ctx.enforceImageBounds) {
      this.ctx.enforceImageBounds();
    }
  }

  /**
   * Handle pointer up with enhanced active state preservation
   */
  handlePointerUp(e) {
    try {
      if (!this.dragState) return;

      const { type: dragType, element, hasMoved } = this.dragState;
      const ctx = this.ctx;
      const wasMoving = hasMoved;
      
      // Remove body dragging class
      document.body.classList.remove('dragging');
      
      if (element) {
        element.classList.remove('dragging');
        
        // CRITICAL FIX: Ensure text layers remain active after drag
        if (dragType === 'text' && element.classList.contains('text-layer')) {
          // Force the element to stay active
          element.classList.add('active');
          
          // Update the active layer in text manager if available
          if (ctx.setActiveLayer) {
            ctx.setActiveLayer(element);
          }
          
          // Trigger a repaint to ensure CSS is applied
          setTimeout(() => {
            element.classList.add('active');
            if (ctx.syncToolbarFromActive) {
              ctx.syncToolbarFromActive();
            }
          }, 0);
        }
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

      // Release pointer capture
      if (this.capturedPointerId !== null) {
        const work = ctx.work;
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
   * Handle work area clicks with edit mode awareness
   */
  handleWorkClick(e) {
    if (this.preventNextClick) {
      e.preventDefault();
      e.stopPropagation();
      this.preventNextClick = false;
      return;
    }
    
    // Check if clicking on a text layer in edit mode
    const textLayer = e.target.closest('.layer.text-layer');
    if (textLayer && textLayer.dataset.editing === 'true') {
      // Allow the click to proceed for text editing
      return;
    }
    
    // Clear active layer if clicking on empty space
    if (e.target === this.ctx.work) {
      const layers = document.querySelectorAll('.layer');
      layers.forEach(layer => {
        layer.classList.remove('active');
        // Exit edit mode if active
        if (layer.dataset.editing === 'true') {
          if (this.ctx.exitTextEditMode) {
            this.ctx.exitTextEditMode();
          }
        }
      });
    }
  }

  /**
   * Handle escape key
   */
  handleEscapeKey(e) {
    if (e.key === 'Escape') {
      if (this.isDragging()) {
        this.forceEndDrag();
      } else if (this.ctx.isInEditMode && this.ctx.isInEditMode()) {
        if (this.ctx.exitTextEditMode) {
          this.ctx.exitTextEditMode();
        }
      }
    }
  }

  /**
   * Background box pointer down
   */
  _onBgBoxDown(e) {
    const bgBox = this.ctx.bgBox;
    const imgState = this.ctx.imgState;
    const getLocked = this.ctx.getLocked;
    
    if (!imgState?.has || (getLocked && getLocked())) return;
    
    this.startHandleTransform(e, e.target);
  }

  /**
   * Background box pointer move
   */
  _onBgBoxMove(e) {
    // Handle background box move if needed
  }

  /**
   * Background box pointer up
   */
  _onBgBoxUp(e) {
    // Handle background box up if needed
  }

  /**
   * Text element pointer down (fallback)
   */
  _onTextDown(e) {
    const getLocked = this.ctx.getLocked;
    const setActiveLayer = this.ctx.setActiveLayer;
    
    if (getLocked && getLocked()) return;

    const t = e.currentTarget;
    
    // Don't start drag if in edit mode
    if (t.dataset.editing === 'true' || t.contentEditable === 'true') {
      return;
    }
    
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
   * Utility: Force end drag operation with edit mode respect
   */
  forceEndDrag() {
    try {
      document.body?.classList?.remove?.('dragging');
      
      if (this.dragState?.element?.classList) {
        const element = this.dragState.element;
        element.classList.remove('dragging');
        
        // Don't interfere with edit mode
        if (element.dataset.editing !== 'true') {
          element.classList.add('active');
        }
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
    
    // Don't attach if already in edit mode
    if (el.dataset.editing === 'true') {
      return;
    }
    
    el.addEventListener('pointerdown', this._onTextDown);
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