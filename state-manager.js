// state-manager.js - Fixed version with proper exports

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
 * Application State Manager
 * Manages all application state, history, and persistence
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

  // ===================
  // PROJECT OPERATIONS
  // ===================

  /**
   * Build project for serialization
   */
  buildProject() {
    const fontFamilySelect = document.querySelector('#fontFamily');
    const fontSizeInput = document.querySelector('#fontSize');
    const fontColorInput = document.querySelector('#fontColor');
    
    return {
      v: 62,
      slides: this.slides,
      activeIndex: this.activeIndex,
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
   * Apply project data to state
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

      this.notify('projectApplied', project);
    } catch (error) {
      console.error('Error applying project:', error);
    }
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
   * Save project
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
   * Undo last action
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
   * Redo last undone action
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
   * Apply history snapshot
   */
  applyHistorySnapshot(snapshot) {
    try {
      this.history.isLocked = true;
      const project = JSON.parse(snapshot);
      this.applyProject(project);
      
      // Update slide display if needed
      if (typeof window !== 'undefined' && window.loadSlideIntoDOM) {
        window.loadSlideIntoDOM(this.slides[this.activeIndex]);
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
   * Get debug info
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
      projectId: this.currentProjectId
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

// State setters
export const setIsViewer = (value) => { stateManager.isViewer = value; };
export const setSlides = (value) => { stateManager.slides = value; };
export const setActiveIndex = (value) => { stateManager.activeIndex = value; };
export const setActiveLayer = (value) => { stateManager.activeLayer = value; };
export const setPlaying = (value) => { stateManager.playing = value; };
export const setRafId = (value) => { stateManager.rafId = value; };
export const setSlideStartTs = (value) => { stateManager.slideStartTs = value; };
export const setCurrentProjectId = (value) => { stateManager.currentProjectId = value; };

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