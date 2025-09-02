// event-handlers.js - Centralized event handling management

/**
 * Centralizes all event handler setup and management
 * Handles keyboard shortcuts, UI interactions, and form submissions
 */
export class EventHandlersManager {
  constructor() {
    this.isInitialized = false;
    this.handlers = new Map(); // Track registered handlers for cleanup
    
    // Bind methods to preserve context
    this.handleKeyboardShortcuts = this.handleKeyboardShortcuts.bind(this);
  }

  /**
   * Initialize all event handlers
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('EventHandlersManager already initialized');
      return;
    }

    try {
      this.setupUndoRedoHandlers();
      this.setupSlideNavigationHandlers();
      this.setupSlideManagementHandlers();
      this.setupTextManagementHandlers();
      this.setupTextStylingHandlers();
      this.setupTextFadeHandlers();
      this.setupImageManagementHandlers();
      this.setupImageFadeHandlers();
      this.setupPresetHandlers();
      this.setupKeyboardShortcuts();
      
      this.isInitialized = true;
      console.log('✅ EventHandlersManager initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize EventHandlersManager:', error);
      throw error;
    }
  }

  /**
   * Setup undo/redo handlers
   */
  setupUndoRedoHandlers() {
    this.registerClickHandler('undoBtn', async () => {
      const { doUndo } = await import('./state-manager.js');
      doUndo();
    });

    this.registerClickHandler('redoBtn', async () => {
      const { doRedo } = await import('./state-manager.js');
      doRedo();
    });
  }

  /**
   * Setup slide navigation handlers
   */
  setupSlideNavigationHandlers() {
    this.registerClickHandler('prevSlideBtn', async () => {
      const { previousSlide } = await import('./slide-manager.js');
      await previousSlide();
    });

    this.registerClickHandler('nextSlideBtn', async () => {
      const { nextSlide } = await import('./slide-manager.js');
      await nextSlide();
    });

    this.registerClickHandler('playSlidesBtn', async () => {
      const { togglePlay } = await import('./slide-manager.js');
      togglePlay();
    });
  }

  /**
   * Setup slide management handlers
   */
  setupSlideManagementHandlers() {
    this.registerClickHandler('addSlideBtn', async () => {
      const { addSlide } = await import('./slide-manager.js');
      addSlide();
    });

    this.registerClickHandler('dupSlideBtn', async () => {
      const { duplicateSlide } = await import('./slide-manager.js');
      duplicateSlide();
    });

    this.registerClickHandler('delSlideBtn', async () => {
      const { deleteSlide } = await import('./slide-manager.js');
      deleteSlide();
    });

    // Slide duration handler
    this.registerInputHandler('slideDur', async (e) => {
      const { handleSlideDurationChange } = await import('./slide-manager.js');
      handleSlideDurationChange(Number(e.target.value) || 0);
    });
  }

  /**
   * Setup text management handlers
   */
  setupTextManagementHandlers() {
    // Add text button
    this.registerClickHandler('addTextBtn', async () => {
      const addTextInput = document.getElementById('addText');
      const text = addTextInput?.value.trim();
      if (text) {
        const { addTextLayer } = await import('./text-manager.js');
        addTextLayer(text);
      }
    });

    // Add text on Enter key
    this.registerKeydownHandler('addText', async (e) => {
      if (e.key === 'Enter') {
        const text = e.target.value.trim();
        if (text) {
          const { addTextLayer } = await import('./text-manager.js');
          addTextLayer(text);
        }
      }
    });

    // Delete text button
    this.registerClickHandler('textDelete', async () => {
      const { deleteActiveText } = await import('./text-manager.js');
      deleteActiveText();
    });
  }

  /**
   * Setup text styling handlers
   */
  setupTextStylingHandlers() {
    this.registerInputHandler('fontSize', async (e) => {
      const { handleFontSize } = await import('./text-manager.js');
      handleFontSize(e.target.value);
    });

    this.registerChangeHandler('fontColor', async (e) => {
      const { handleFontColor } = await import('./text-manager.js');
      handleFontColor(e.target.value);
    });

    this.registerChangeHandler('fontFamily', async (e) => {
      const { handleFontFamily } = await import('./text-manager.js');
      handleFontFamily(e.target.value);
    });

    this.registerClickHandler('boldBtn', async () => {
      const { handleBold } = await import('./text-manager.js');
      handleBold();
    });

    this.registerClickHandler('italicBtn', async () => {
      const { handleItalic } = await import('./text-manager.js');
      handleItalic();
    });

    this.registerClickHandler('underlineBtn', async () => {
      const { handleUnderline } = await import('./text-manager.js');
      handleUnderline();
    });
  }

  /**
   * Setup text fade handlers
   */
  setupTextFadeHandlers() {
    this.registerClickHandler('textFadeInBtn', async () => {
      const { handleTextFadeIn } = await import('./text-manager.js');
      handleTextFadeIn();
    });

    this.registerClickHandler('textFadeOutBtn', async () => {
      const { handleTextFadeOut } = await import('./text-manager.js');
      handleTextFadeOut();
    });

    this.registerInputHandler('textFadeInRange', async (e) => {
      const { handleTextFadeInRange } = await import('./text-manager.js');
      handleTextFadeInRange(e.target.value);
    });

    this.registerInputHandler('textFadeOutRange', async (e) => {
      const { handleTextFadeOutRange } = await import('./text-manager.js');
      handleTextFadeOutRange(e.target.value);
    });
  }

  /**
   * Setup image management handlers
   */
  setupImageManagementHandlers() {
    // Image scaling
    this.registerInputHandler('imgScale', async (e) => {
      const { handleImageScale } = await import('./image-manager.js');
      handleImageScale(e.target.value);
    });

    // Image rotation
    this.registerInputHandler('imgRotate', async (e) => {
      const { handleImageRotate } = await import('./image-manager.js');
      handleImageRotate(e.target.value);
    });

    // Image flip
    this.registerClickHandler('imgFlip', async () => {
      const { handleImageFlip } = await import('./image-manager.js');
      handleImageFlip();
    });

    // Image delete
    this.registerClickHandler('imgDelete', async () => {
      const { deleteImage } = await import('./image-manager.js');
      deleteImage();
    });

    // Upload background button
    this.registerClickHandler('uploadBgBtn', () => {
      const bgFileInput = document.getElementById('bgFileInput');
      bgFileInput?.click();
    });

    // File input change
    this.registerChangeHandler('bgFileInput', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const { handleImageUpload } = await import('./image-manager.js');
        await handleImageUpload(file);
      }
    });
  }

  /**
   * Setup image fade handlers
   */
  setupImageFadeHandlers() {
    this.registerClickHandler('imgFadeInBtn', async () => {
      const { handleImageFadeIn } = await import('./image-manager.js');
      handleImageFadeIn();
    });

    this.registerClickHandler('imgFadeOutBtn', async () => {
      const { handleImageFadeOut } = await import('./image-manager.js');
      handleImageFadeOut();
    });

    this.registerInputHandler('imgFadeInRange', async (e) => {
      const { handleImageFadeInRange } = await import('./image-manager.js');
      handleImageFadeInRange(e.target.value);
    });

    this.registerInputHandler('imgFadeOutRange', async (e) => {
      const { handleImageFadeOutRange } = await import('./image-manager.js');
      handleImageFadeOutRange(e.target.value);
    });
  }

  /**
   * Setup preset handlers
   */
  setupPresetHandlers() {
    const presetGrid = document.getElementById('presetGrid');
    if (presetGrid) {
      const handler = async (e) => {
        const btn = e.target.closest('.preset-btn');
        if (btn) {
          const preset = btn.dataset.preset;
          const { applyPreset } = await import('./image-manager.js');
          applyPreset(preset);
        }
      };
      
      presetGrid.addEventListener('click', handler);
      this.handlers.set('presetGrid', { element: presetGrid, event: 'click', handler });
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', this.handleKeyboardShortcuts);
    this.handlers.set('keyboard', { 
      element: document, 
      event: 'keydown', 
      handler: this.handleKeyboardShortcuts 
    });
  }

  /**
   * Handle keyboard shortcuts
   */
  async handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z':
          if (!e.shiftKey) {
            e.preventDefault();
            const { doUndo } = await import('./state-manager.js');
            doUndo();
          } else {
            e.preventDefault();
            const { doRedo } = await import('./state-manager.js');
            doRedo();
          }
          break;
          
        case 'y':
          e.preventDefault();
          const { doRedo } = await import('./state-manager.js');
          doRedo();
          break;
          
        case 's':
          e.preventDefault();
          await this.handleSave();
          break;
      }
    }
  }

  /**
   * Handle save shortcut
   */
  async handleSave() {
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
      console.error('Save failed:', error);
    }
  }

  /**
   * Helper methods for registering event handlers
   */
  registerClickHandler(elementId, handler) {
    this.registerEventHandler(elementId, 'click', handler);
  }

  registerInputHandler(elementId, handler) {
    this.registerEventHandler(elementId, 'input', handler);
  }

  registerChangeHandler(elementId, handler) {
    this.registerEventHandler(elementId, 'change', handler);
  }

  registerKeydownHandler(elementId, handler) {
    this.registerEventHandler(elementId, 'keydown', handler);
  }

  /**
   * Generic event handler registration with error handling
   */
  registerEventHandler(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element with id '${elementId}' not found`);
      return;
    }

    const wrappedHandler = async (e) => {
      try {
        await handler(e);
      } catch (error) {
        console.error(`Error in ${elementId} ${eventType} handler:`, error);
        
        // Show user-friendly error
        const statusText = document.getElementById('statusText');
        if (statusText) {
          statusText.textContent = 'An error occurred';
          setTimeout(() => statusText.textContent = '', 2000);
        }
      }
    };

    element.addEventListener(eventType, wrappedHandler);
    this.handlers.set(`${elementId}-${eventType}`, { element, event: eventType, handler: wrappedHandler });
  }

  /**
   * Get all registered handlers (for debugging)
   */
  getRegisteredHandlers() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a specific handler is registered
   */
  isHandlerRegistered(elementId, eventType = 'click') {
    return this.handlers.has(`${elementId}-${eventType}`);
  }

  /**
   * Cleanup all event handlers
   */
  cleanup() {
    console.log('🧹 Cleaning up event handlers...');
    
    // Remove all registered handlers
    for (const [key, { element, event, handler }] of this.handlers) {
      try {
        element.removeEventListener(event, handler);
      } catch (error) {
        console.warn(`Failed to remove handler ${key}:`, error);
      }
    }
    
    this.handlers.clear();
    this.isInitialized = false;
    
    console.log('✅ EventHandlersManager cleaned up');
  }
}