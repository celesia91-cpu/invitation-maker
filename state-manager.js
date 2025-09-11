// state-manager.js - COMPLETE ENHANCED VERSION WITH PERCENTAGE-BASED POSITIONING SUPPORT

import { calculateViewportScale } from './utils.js';

// Import dependencies
let apiClient;
try {
  const module = await import('./api-client.js');
  apiClient = module.default || module.apiClient || {};
} catch (e) {
  console.warn('API client not available:', e);
  apiClient = { token: null };
}

// Constants
const STORAGE_KEY = 'invitationMaker_project';
const MAX_HISTORY = 50;

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * ENHANCED Application State Manager
 * Manages all application state, history, and persistence with percentage-based positioning support
 */
class ApplicationStateManager {
  constructor() {
    this.state = {
      isViewer: false,
      slides: [],
      activeIndex: 0,
      currentProjectId: null,
      activeLayer: null,
      playing: false,
      rafId: 0,
      slideStartTs: 0,
      rsvpChoice: 'none',
      mapQuery: '',
      viewerMode: false,
      workDimensions: { width: 1280, height: 720 }, // Track work area size for scaling
      defaults: {
        fontFamily: 'system-ui',
        fontSize: 28,
        fontColor: '#ffffff'
      }
    };
    
    this.history = {
      stack: [],
      index: -1,
      isLocked: false,
      maxSize: MAX_HISTORY
    };
    
    this.listeners = new Map();
    this.currentProjectId = null;
  }

  // ===================
  // GETTERS & SETTERS
  // ===================

  get isViewer() { return this.state.isViewer; }
  set isViewer(value) { 
    this.state.isViewer = value;
    this.state.viewerMode = value;
    this.notify('isViewer', value);
  }

  get slides() { return this.state.slides; }
  set slides(value) { 
    this.state.slides = value;
    this.notify('slides', value);
  }

  get activeIndex() { return this.state.activeIndex; }
  set activeIndex(value) { 
    this.state.activeIndex = value;
    this.notify('activeIndex', value);
  }

  get activeLayer() { return this.state.activeLayer; }
  set activeLayer(value) { 
    this.state.activeLayer = value;
    this.notify('activeLayer', value);
  }

  get playing() { return this.state.playing; }
  set playing(value) { 
    this.state.playing = value;
    this.notify('playing', value);
  }

  get rafId() { return this.state.rafId; }
  set rafId(value) { 
    this.state.rafId = value;
    this.notify('rafId', value);
  }

  get slideStartTs() { return this.state.slideStartTs; }
  set slideStartTs(value) { 
    this.state.slideStartTs = value;
    this.notify('slideStartTs', value);
  }

  get rsvpChoice() { return this.state.rsvpChoice; }
  set rsvpChoice(value) { 
    this.state.rsvpChoice = value;
    this.notify('rsvpChoice', value);
  }

  get mapQuery() { return this.state.mapQuery; }
  set mapQuery(value) { 
    this.state.mapQuery = value;
    this.notify('mapQuery', value);
  }

  get workDimensions() { return this.state.workDimensions; }
  set workDimensions(value) { 
    this.state.workDimensions = value;
    this.notify('workDimensions', value);
  }

  // ===================
  // ENHANCED PROJECT OPERATIONS WITH POSITIONING SUPPORT
  // ===================

  /**
   * Build project for serialization with enhanced positioning data
   */
  buildProject() {
    const fontFamilySelect = document.querySelector('#fontFamily');
    const fontSizeInput = document.querySelector('#fontSize');
    const fontColorInput = document.querySelector('#fontColor');
    const work = document.querySelector('#work');
    
    // Capture current work dimensions for scaling calculations
    let workDimensions = this.workDimensions;
    if (work) {
      const rect = work.getBoundingClientRect();
      workDimensions = { width: rect.width, height: rect.height };
      this.workDimensions = workDimensions;
    }
    
    return {
      v: 63, // Increment version for percentage positioning support
      slides: this.slides,
      activeIndex: this.activeIndex,
      workDimensions: workDimensions, // Include work dimensions for proper scaling
      defaults: {
        fontFamily: fontFamilySelect?.value || this.state.defaults.fontFamily,
        fontSize: parseInt(fontSizeInput?.value, 10) || this.state.defaults.fontSize,
        fontColor: fontColorInput?.value || this.state.defaults.fontColor
      },
      rsvp: this.rsvpChoice,
      mapQuery: this.mapQuery
    };
  }

  /**
   * ENHANCED: Apply project data to state with positioning support
   */
  applyProject(project) {
    if (!project || typeof project !== 'object') {
      console.warn('Invalid project data provided to applyProject');
      return;
    }

    try {
      // Apply slides
      if (Array.isArray(project.slides)) {
        this.slides = project.slides;
      }

      // Apply active index
      if (typeof project.activeIndex === 'number') {
        this.activeIndex = Math.max(0, Math.min(project.activeIndex, this.slides.length - 1));
      }

      // Apply work dimensions if available
      if (project.workDimensions) {
        this.workDimensions = project.workDimensions;
      }

      // Apply RSVP choice
      if (project.rsvp) {
        this.rsvpChoice = project.rsvp;
      }

      // Apply map query
      if (project.mapQuery) {
        this.mapQuery = project.mapQuery;
      }

      // Apply UI defaults
      if (project.defaults) {
        const fontFamilySelect = document.querySelector('#fontFamily');
        const fontSizeInput = document.querySelector('#fontSize');
        const fontColorInput = document.querySelector('#fontColor');

        if (fontFamilySelect && project.defaults.fontFamily) {
          fontFamilySelect.value = project.defaults.fontFamily;
        }
        if (fontSizeInput && project.defaults.fontSize) {
          fontSizeInput.value = project.defaults.fontSize;
        }
        if (fontColorInput && project.defaults.fontColor) {
          fontColorInput.value = project.defaults.fontColor;
        }

        this.state.defaults = { ...this.state.defaults, ...project.defaults };
      }

      console.log('✅ Project applied with enhanced positioning support');
      this.notify('projectApplied', project);
    } catch (error) {
      console.error('Error applying project:', error);
    }
  }

  /**
   * ENHANCED: Load slide into DOM with positioning support
   */
  async loadSlideIntoDOM(slide, slideIndex = null) {
    if (!slide) return;

    try {
      // Clear existing content
      const work = document.querySelector('#work');
      if (!work) return;

      // Clear existing layers
      const existingLayers = work.querySelectorAll('.layer');
      existingLayers.forEach(layer => layer.remove());

      // Load image if present
      if (slide.image) {
        await this.loadSlideImage(slide.image);
      }

      // Load text layers if present
      if (slide.layers && slide.layers.length > 0) {
        await this.loadTextLayers(slide.layers);
      }

      console.log('✅ Slide loaded into DOM with positioning support');
    } catch (error) {
      console.error('Error loading slide into DOM:', error);
    }
  }

  /**
   * ENHANCED: Load slide image with percentage positioning support
   */
  async loadSlideImage(imageData) {
    if (!imageData || !imageData.src) return;

    const userBgEl = document.querySelector('#userBg');
    if (!userBgEl) return;

    return new Promise((resolve) => {
      userBgEl.onload = async () => {
        try {
          // Import image manager functions
          const imageManager = await import('./image-manager.js');
          const { imgState, setImagePositionFromPercentage, setTransforms } = imageManager;

          imgState.has = true;
          imgState.natW = userBgEl.naturalWidth;
          imgState.natH = userBgEl.naturalHeight;

          const work = document.querySelector('#work');
          if (!work) {
            resolve();
            return;
          }

          const rect = work.getBoundingClientRect();
          const { scale: containScale } = calculateViewportScale(
            rect.width,
            rect.height,
            imgState.natW,
            imgState.natH,
            'contain'
          );
          const defaultScale = Math.min(1, containScale);

          // Check if we have percentage-based coordinates (new format)
          if (imageData.cxPercent !== undefined && imageData.cyPercent !== undefined) {
            console.log('📍 Loading image with percentage-based positioning');

            setImagePositionFromPercentage({
              cxPercent: imageData.cxPercent,
              cyPercent: imageData.cyPercent,
              scale: typeof imageData.scale === 'number' ? imageData.scale : defaultScale,
              angle: imageData.angle || 0,
              shearX: imageData.shearX || 0,
              shearY: imageData.shearY || 0,
              signX: imageData.signX || 1,
              signY: imageData.signY || 1,
              flip: imageData.flip || false
            });
          } else {
            console.log('📍 Loading image with legacy absolute positioning');
            
            // Handle legacy absolute coordinates with scaling
            const sourceWorkDimensions = this.workDimensions;
            const currentWorkDimensions = { width: rect.width, height: rect.height };
            
            // Calculate scaling factors if work dimensions changed
            let scaleX = 1;
            let scaleY = 1;

            if (sourceWorkDimensions &&
                (Math.abs(sourceWorkDimensions.width - currentWorkDimensions.width) > 10 ||
                 Math.abs(sourceWorkDimensions.height - currentWorkDimensions.height) > 10)) {
              const scales = calculateViewportScale(
                currentWorkDimensions.width,
                currentWorkDimensions.height,
                sourceWorkDimensions.width,
                sourceWorkDimensions.height,
                'contain'
              );
              scaleX = scales.scaleX;
              scaleY = scales.scaleY;

              console.log('🔧 Scaling legacy coordinates:', {
                from: sourceWorkDimensions,
                to: currentWorkDimensions,
                scale: { scaleX, scaleY }
              });
            }

            imgState.cx = (imageData.cx || currentWorkDimensions.width / 2) * scaleX;
            imgState.cy = (imageData.cy || currentWorkDimensions.height / 2) * scaleY;
            imgState.scale = typeof imageData.scale === 'number' ? imageData.scale : defaultScale;
            imgState.angle = imageData.angle || 0;
            imgState.shearX = imageData.shearX || 0;
            imgState.shearY = imageData.shearY || 0;
            imgState.signX = imageData.signX || 1;
            imgState.signY = imageData.signY || 1;
            imgState.flip = imageData.flip || false;

            setTransforms();
          }

          // Apply image effects
          if (imageData.fadeInMs) imgState.fadeInMs = imageData.fadeInMs;
          if (imageData.fadeOutMs) imgState.fadeOutMs = imageData.fadeOutMs;
          if (imageData.zoomInMs) imgState.zoomInMs = imageData.zoomInMs;
          if (imageData.zoomOutMs) imgState.zoomOutMs = imageData.zoomOutMs;

          resolve();
        } catch (error) {
          console.error('Error setting up image:', error);
          resolve();
        }
      };

      userBgEl.onerror = () => {
        console.error('Failed to load image:', imageData.src);
        resolve();
      };

      userBgEl.src = imageData.src;
    });
  }

  /**
   * ENHANCED: Load text layers with responsive scaling
   */
  async loadTextLayers(layers) {
    const work = document.querySelector('#work');
    if (!work || !layers.length) return;

    const currentRect = work.getBoundingClientRect();
    const sourceWorkDimensions = this.workDimensions;
    
    // Calculate scaling factors for responsive text positioning
    let scaleX = 1;
    let scaleY = 1;
    let fontScale = 1;
    
    if (sourceWorkDimensions) {
      scaleX = currentRect.width / sourceWorkDimensions.width;
      scaleY = currentRect.height / sourceWorkDimensions.height;
      fontScale = Math.min(scaleX, scaleY); // Use minimum scale to maintain readability
    }

    for (const layerData of layers) {
      const element = document.createElement('div');
      element.className = 'layer text-layer';
      element.contentEditable = 'false';
      element.textContent = layerData.text || 'Text';
      element.id = layerData.id || `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Apply scaled positioning and styles
      element.style.position = 'absolute';
      element.style.left = ((layerData.left || 0) * scaleX) + 'px';
      element.style.top = ((layerData.top || 0) * scaleY) + 'px';
      element.style.fontSize = ((layerData.fontSize || 28) * fontScale) + 'px';
      element.style.fontFamily = layerData.fontFamily || 'system-ui';
      element.style.fontWeight = layerData.fontWeight || 'normal';
      element.style.fontStyle = layerData.fontStyle || 'normal';
      element.style.color = layerData.color || '#ffffff';
      element.style.textAlign = layerData.textAlign || 'left';
      element.style.textDecoration = layerData.textDecoration || 'none';
      element.style.zIndex = layerData.zIndex || '30';

      // Apply width if specified
      if (layerData.width) {
        element.style.width = (layerData.width * scaleX) + 'px';
      }

      // Apply transform if present
      if (layerData.transform) {
        element.style.transform = layerData.transform;
      }

      work.appendChild(element);
    }

    console.log('✅ Text layers loaded with responsive scaling');
  }

  /**
   * Load project from local storage
   */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const project = JSON.parse(stored);
        this.applyProject(project);
        console.log('Project loaded from local storage');
        return project;
      }
    } catch (error) {
      console.error('Failed to load from local storage:', error);
    }
    return null;
  }

  /**
   * Save project with enhanced positioning data
   */
  async save() {
    if (this.history.isLocked) return;

    try {
      const projectData = this.buildProject();
      
      // Always save locally first
      this.saveToLocalStorage(JSON.stringify(projectData));

      // Try backend save for authenticated users
      if (apiClient?.token && this.currentProjectId) {
        try {
          await apiClient.updateProject(this.currentProjectId, projectData);
          console.log('Project updated in cloud');
        } catch (error) {
          if (error.message?.includes('404') || error.message?.includes('Not Found')) {
            this.currentProjectId = null;
            const response = await apiClient.saveProject(projectData);
            if (response?.projectId) this.currentProjectId = response.projectId;
            console.log('Project re-created in cloud');
          } else {
            throw error;
          }
        }
      } else if (apiClient?.token) {
        const response = await apiClient.saveProject(projectData);
        if (response?.projectId) this.currentProjectId = response.projectId;
        console.log('Project saved to cloud');
      }
    } catch (error) {
      console.error('Backend save failed:', error);
      console.log('Saved locally only');
    }
  }

  /**
   * Save to local storage
   */
  saveToLocalStorage(data = null) {
    try {
      const projectData = data || JSON.stringify(this.buildProject());
      localStorage.setItem(STORAGE_KEY, projectData);
    } catch (error) {
      console.error('Local storage save failed:', error);
    }
  }

  // ===================
  // HISTORY MANAGEMENT
  // ===================

  /**
   * Push current state to history
   */
  pushHistory() {
    if (this.history.isLocked) return;

    try {
      const stateSnapshot = JSON.stringify(this.buildProject());
      
      // Remove future states if we're not at the end
      if (this.history.index < this.history.stack.length - 1) {
        this.history.stack = this.history.stack.slice(0, this.history.index + 1);
      }

      // Add new state
      this.history.stack.push(stateSnapshot);
      this.history.index = this.history.stack.length - 1;

      // Limit history size
      if (this.history.stack.length > this.history.maxSize) {
        this.history.stack.shift();
        this.history.index--;
      }

      this.updateUndoRedoUI();
    } catch (error) {
      console.error('Failed to push history:', error);
    }
  }

  /**
   * Undo last action with positioning support
   */
  undo() {
    if (this.history.index <= 0) return false;

    try {
      this.history.index--;
      const snapshot = this.history.stack[this.history.index];
      this.applyHistorySnapshot(snapshot);
      this.updateUndoRedoUI();
      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      return false;
    }
  }

  /**
   * Redo last undone action with positioning support
   */
  redo() {
    if (this.history.index >= this.history.stack.length - 1) return false;

    try {
      this.history.index++;
      const snapshot = this.history.stack[this.history.index];
      this.applyHistorySnapshot(snapshot);
      this.updateUndoRedoUI();
      return true;
    } catch (error) {
      console.error('Redo failed:', error);
      return false;
    }
  }

  /**
   * ENHANCED: Apply history snapshot with positioning support
   */
  applyHistorySnapshot(snapshot) {
    try {
      this.history.isLocked = true;
      const project = JSON.parse(snapshot);
      this.applyProject(project);
      
      // Update slide display with enhanced positioning
      if (this.slides.length > 0 && this.activeIndex >= 0) {
        this.loadSlideIntoDOM(this.slides[this.activeIndex], this.activeIndex);
      }
    } catch (error) {
      console.error('Failed to apply history snapshot:', error);
    } finally {
      this.history.isLocked = false;
    }
  }

  /**
   * Update undo/redo UI buttons
   */
  updateUndoRedoUI() {
    const undoBtn = document.querySelector('#undoBtn');
    const redoBtn = document.querySelector('#redoBtn');

    if (undoBtn) {
      undoBtn.disabled = this.history.index <= 0;
    }
    if (redoBtn) {
      redoBtn.disabled = this.history.index >= this.history.stack.length - 1;
    }
  }

  /**
   * Initialize history with current state
   */
  initializeHistory() {
    this.history.isLocked = true;
    this.history.stack = [JSON.stringify(this.buildProject())];
    this.history.index = 0;
    this.history.isLocked = false;
    this.updateUndoRedoUI();
  }

  /**
   * Lock/unlock history
   */
  lockHistory(locked = true) {
    this.history.isLocked = locked;
  }

  // ===================
  // ENHANCED VIEWER MODE SUPPORT
  // ===================

  /**
   * Setup viewer mode with positioning support
   */
  setupViewerMode() {
    this.isViewer = true;
    const body = document.body;
    body.classList.add('viewer');
    
    // Apply viewer-specific layout
    this.applyViewerLayout();
    
    console.log('🎬 Viewer mode setup complete');
  }

  /**
   * Apply viewer-specific layout for consistent positioning
   */
  applyViewerLayout() {
    const stage = document.querySelector('.stage');
    const wrap = document.querySelector('.wrap');
    
    if (stage) {
      stage.style.minHeight = '100vh';
      stage.style.padding = '0';
    }
    
    if (wrap) {
      // Maintain aspect ratio for consistent coordinate system
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        wrap.style.width = '100vw';
        wrap.style.height = '100vh';
        wrap.style.borderRadius = '0';
      } else {
        wrap.style.width = 'min(100vw, calc(100vh * 16/9))';
        wrap.style.height = 'min(100vh, calc(100vw * 9/16))';
        wrap.style.aspectRatio = '16 / 9';
      }
    }
  }

  // ===================
  // EVENT SYSTEM
  // ===================

  /**
   * Subscribe to state changes
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(key, callback) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).delete(callback);
    }
  }

  /**
   * Notify listeners of state changes
   */
  notify(key, value) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error(`Error in listener for ${key}:`, error);
        }
      });
    }
  }

  /**
   * Get current state or specific path
   */
  getState(path = null) {
    if (!path) return { ...this.state };
    
    const keys = path.split('.');
    let result = this.state;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    
    return result;
  }

  /**
   * Set state with batch updates and optional history push
   */
  setState(updates, options = {}) {
    const { silent = false, skipHistory = false } = options;
    
    for (const [key, value] of Object.entries(updates)) {
      if (key in this.state) {
        const target = this.state[key];
        if (
          target && typeof target === 'object' && !Array.isArray(target) &&
          value && typeof value === 'object' && !Array.isArray(value)
        ) {
          this.state[key] = { ...target, ...value };
        } else {
          this.state[key] = value;
        }
        if (!silent) {
          this.notify(key, this.state[key]);
        }
      }
    }
    
    if (!skipHistory) {
      this.pushHistoryDebounced();
    }
  }

  // ===================
  // UTILITY METHODS
  // ===================

  /**
   * Get map URL based on current query
   */
  getMapUrl() {
    if (!this.mapQuery) return '';
    const encoded = encodeURIComponent(this.mapQuery);
    return `https://www.google.com/maps?q=${encoded}`;
  }

  /**
   * ENHANCED: Update work dimensions when work area resizes
   */
  updateWorkDimensions() {
    const work = document.querySelector('#work');
    if (!work) return;
    
    const rect = work.getBoundingClientRect();
    const newDimensions = { width: rect.width, height: rect.height };
    
    // Only update if dimensions changed significantly
    if (Math.abs(this.workDimensions.width - newDimensions.width) > 5 ||
        Math.abs(this.workDimensions.height - newDimensions.height) > 5) {
      
      this.workDimensions = newDimensions;
      console.log('📐 Work dimensions updated:', newDimensions);
    }
  }

  deepMerge(target, source) {
    if (Array.isArray(source)) {
      return [...source];
    }
    if (source && typeof source === 'object' && source.constructor === Object) {
      const base = target && typeof target === 'object' ? target : {};
      const result = { ...base };
      for (const [k, v] of Object.entries(source)) {
        result[k] = this.deepMerge(base[k], v);
      }
      return result;
    }
    return source;
  }

  /**
   * Reset to default state
   */
  reset() {
    this.state = {
      isViewer: false,
      slides: [],
      activeIndex: 0,
      currentProjectId: null,
      activeLayer: null,
      playing: false,
      rafId: 0,
      slideStartTs: 0,
      rsvpChoice: 'none',
      mapQuery: '',
      viewerMode: false,
      workDimensions: { width: 1280, height: 720 },
      defaults: {
        fontFamily: 'system-ui',
        fontSize: 28,
        fontColor: '#ffffff'
      }
    };
    
    this.history = {
      stack: [],
      index: -1,
      isLocked: false,
      maxSize: MAX_HISTORY
    };
    
    this.listeners.clear();
  }

  /**
   * Get debug info with positioning data
   */
  getDebugInfo() {
    return {
      state: this.getState(),
      history: {
        stackSize: this.history.stack.length,
        currentIndex: this.history.index,
        canUndo: this.history.index > 0,
        canRedo: this.history.index < this.history.stack.length - 1,
        isLocked: this.history.isLocked
      },
      listeners: Array.from(this.listeners.keys()),
      projectId: this.currentProjectId,
      workDimensions: this.workDimensions,
      positioningSupport: {
        version: 63,
        percentagePositioning: true,
        responsiveScaling: true
      }
    };
  }
}

// Create singleton instance
const stateManager = new ApplicationStateManager();

// Create debounced functions
const saveProjectDebounced = debounce(() => stateManager.save(), 300);
const pushHistoryDebounced = debounce(() => stateManager.pushHistory(), 350);

// Assign to instance for internal use
stateManager.pushHistoryDebounced = pushHistoryDebounced;

// Backward compatibility - expose history state
export const historyState = {
  get stack() { return stateManager.history.stack; },
  get idx() { return stateManager.history.index; },
  get lock() { return stateManager.history.isLocked; },
  set lock(value) { stateManager.lockHistory(value); }
};

// ===================
// PRIMARY EXPORTS
// ===================

// Core project operations
export const buildProject = () => stateManager.buildProject();
export const applyProject = (project) => stateManager.applyProject(project);
export const loadProject = () => stateManager.loadFromLocalStorage();
export const saveProject = () => stateManager.save();
export { saveProjectDebounced };

// Enhanced slide operations
export const loadSlideIntoDOM = (slide, slideIndex = null) => stateManager.loadSlideIntoDOM(slide, slideIndex);

// History management
export const initializeHistory = () => stateManager.initializeHistory();
export const doUndo = () => stateManager.undo();
export const doRedo = () => stateManager.redo();
export const updateUndoRedoUI = () => stateManager.updateUndoRedoUI();
export const pushHistory = () => stateManager.pushHistory();
export { pushHistoryDebounced };
export const recordHistory = () => stateManager.pushHistoryDebounced();

// State getters
export const getIsViewer = () => stateManager.isViewer;
export const getSlides = () => stateManager.slides;
export const getActiveIndex = () => stateManager.activeIndex;
export const getActiveLayer = () => stateManager.activeLayer;
export const getPlaying = () => stateManager.playing;
export const getRafId = () => stateManager.rafId;
export const getSlideStartTs = () => stateManager.slideStartTs;
export const getRsvpChoice = () => stateManager.rsvpChoice;
export const getMapQuery = () => stateManager.mapQuery;
export const getMapUrl = () => stateManager.getMapUrl();
export const getWorkDimensions = () => stateManager.workDimensions;

// State setters
export const setIsViewer = (value) => { stateManager.isViewer = value; };
export const setSlides = (value) => { stateManager.slides = value; };
export const setActiveIndex = (value) => { stateManager.activeIndex = value; };
export const setActiveLayer = (value) => { stateManager.activeLayer = value; };
export const setPlaying = (value) => { stateManager.playing = value; };
export const setRafId = (value) => { stateManager.rafId = value; };
export const setSlideStartTs = (value) => { stateManager.slideStartTs = value; };
export const setCurrentProjectId = (value) => { stateManager.currentProjectId = value; };
export const setWorkDimensions = (value) => { stateManager.workDimensions = value; };

// Enhanced viewer mode support
export const setupViewerMode = () => stateManager.setupViewerMode();
export const updateWorkDimensions = () => stateManager.updateWorkDimensions();

// RSVP and map helpers
export const handleRsvpChoice = (choice) => {
  stateManager.rsvpChoice = choice;
  saveProjectDebounced();
};

export const handleMapQuery = (query) => {
  stateManager.mapQuery = (query || '').trim();
  saveProjectDebounced();
};

// Advanced state management
export const subscribe = (key, callback) => stateManager.subscribe(key, callback);
export const unsubscribe = (key, callback) => stateManager.unsubscribe(key, callback);
export const setState = (updates, options) => stateManager.setState(updates, options);
export const getState = (path) => stateManager.getState(path);

// Export manager instance for advanced usage
export { stateManager };
export default stateManager;