// state-manager.js - Consistent state management with clear patterns

import { apiClient } from './api-client.js';
import { debounce, toast, STORAGE_KEY, MAX_HISTORY } from './utils.js';

/**
 * Centralized Application State Manager
 * Provides consistent patterns for state management, validation, and persistence
 */
class ApplicationStateManager {
  constructor() {
    // Core application state
    this.state = {
      // UI Mode
      isViewer: false,
      
      // Project data
      slides: [],
      activeIndex: 0,
      currentProjectId: null,
      
      // UI state
      activeLayer: null,
      playing: false,
      rafId: 0,
      slideStartTs: 0,
      
      // User preferences
      rsvpChoice: 'none',
      mapQuery: '',
      
      // Default values
      defaults: {
        fontFamily: 'system-ui',
        fontSize: 28,
        fontColor: '#ffffff'
      }
    };

    // History management (separate from main state)
    this.history = {
      stack: [],
      index: -1,
      isLocked: false,
      maxSize: MAX_HISTORY
    };

    // State change listeners
    this.listeners = new Map();
    
    // Bind methods to preserve context
    this.setState = this.setState.bind(this);
    this.getState = this.getState.bind(this);
    
    // Create debounced methods after binding
    this.pushHistoryDebounced = debounce(this.pushHistory.bind(this), 350);
  }

  // ===================
  // CORE STATE METHODS
  // ===================

  /**
   * Get current state (or specific path)
   */
  getState(path = null) {
    if (path) {
      return this.getNestedValue(this.state, path);
    }
    return { ...this.state }; // Return copy to prevent mutations
  }

  /**
   * Set state with validation and change notification
   */
  setState(updates, options = {}) {
    const { validate = true, notify = true, merge = true } = options;
    
    // Validate updates if requested
    if (validate && !this.validateStateUpdates(updates)) {
      console.warn('Invalid state updates rejected:', updates);
      return false;
    }

    // Create new state
    const newState = merge 
      ? { ...this.state, ...updates }
      : updates;

    // Deep merge for nested objects
    const mergedState = this.deepMerge(this.state, newState);
    
    // Store previous state for change detection
    const previousState = { ...this.state };
    
    // Update state
    this.state = mergedState;
    
    // Notify listeners if requested
    if (notify) {
      this.notifyStateChange(previousState, this.state, updates);
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value using dot notation
   */
  setNestedValue(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, this.state);
    
    target[lastKey] = value;
    this.notifyStateChange(null, this.state, { [path]: value });
  }

  // ===================
  // VALIDATION METHODS
  // ===================

  /**
   * Validate state updates
   */
  validateStateUpdates(updates) {
    const validators = {
      slides: (value) => Array.isArray(value),
      activeIndex: (value) => Number.isInteger(value) && value >= 0,
      rsvpChoice: (value) => ['none', 'yes', 'no', 'maybe'].includes(value),
      isViewer: (value) => typeof value === 'boolean',
      playing: (value) => typeof value === 'boolean',
      mapQuery: (value) => typeof value === 'string',
      defaults: (value) => value && typeof value === 'object'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (validators[key] && !validators[key](value)) {
        console.error(`Invalid value for ${key}:`, value);
        return false;
      }
    }

    return true;
  }

  // ===================
  // STATE LISTENERS
  // ===================

  /**
   * Subscribe to state changes
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    return () => this.unsubscribe(key, callback);
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(key, callback) {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.delete(callback);
      if (keyListeners.size === 0) {
        this.listeners.delete(key);
      }
    }
  }

  /**
   * Notify listeners of state changes
   */
  notifyStateChange(previousState, currentState, changes) {
    // Notify general state listeners
    const generalListeners = this.listeners.get('*') || new Set();
    generalListeners.forEach(callback => {
      try {
        callback(currentState, previousState, changes);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });

    // Notify specific key listeners
    for (const key of Object.keys(changes)) {
      const keyListeners = this.listeners.get(key) || new Set();
      keyListeners.forEach(callback => {
        try {
          callback(currentState[key], previousState?.[key], currentState);
        } catch (error) {
          console.error(`Error in ${key} change listener:`, error);
        }
      });
    }
  }

  // ===================
  // CONVENIENCE GETTERS/SETTERS
  // ===================

  // Viewer mode
  get isViewer() { return this.state.isViewer; }
  set isViewer(value) { this.setState({ isViewer: value }); }

  // Slides
  get slides() { return [...this.state.slides]; } // Return copy
  set slides(value) { this.setState({ slides: [...value] }); } // Store copy

  // Active index
  get activeIndex() { return this.state.activeIndex; }
  set activeIndex(value) { 
    const maxIndex = Math.max(0, this.state.slides.length - 1);
    this.setState({ activeIndex: Math.max(0, Math.min(value, maxIndex)) }); 
  }

  // Active layer
  get activeLayer() { return this.state.activeLayer; }
  set activeLayer(value) { this.setState({ activeLayer: value }); }

  // Playing state
  get playing() { return this.state.playing; }
  set playing(value) { this.setState({ playing: value }); }

  // RAF ID
  get rafId() { return this.state.rafId; }
  set rafId(value) { this.setState({ rafId: value }); }

  // Slide start timestamp
  get slideStartTs() { return this.state.slideStartTs; }
  set slideStartTs(value) { this.setState({ slideStartTs: value }); }

  // RSVP choice
  get rsvpChoice() { return this.state.rsvpChoice; }
  set rsvpChoice(value) { this.setState({ rsvpChoice: value }); }

  // Map query
  get mapQuery() { return this.state.mapQuery; }
  set mapQuery(value) { this.setState({ mapQuery: value }); }

  // Current project ID
  get currentProjectId() { return this.state.currentProjectId; }
  set currentProjectId(value) { this.setState({ currentProjectId: value }); }

  // Defaults
  get defaults() { return { ...this.state.defaults }; }
  set defaults(value) { this.setState({ defaults: { ...this.state.defaults, ...value } }); }

  // ===================
  // HISTORY MANAGEMENT
  // ===================

  /**
   * Push current state to history
   */
  pushHistory() {
    if (this.history.isLocked) return;

    const snapshot = JSON.stringify(this.buildProject());
    
    // Don't add if same as current
    if (this.history.index >= 0 && this.history.stack[this.history.index] === snapshot) {
      return;
    }

    // Remove future history if we're not at the end
    if (this.history.index < this.history.stack.length - 1) {
      this.history.stack = this.history.stack.slice(0, this.history.index + 1);
    }

    // Add new snapshot
    this.history.stack.push(snapshot);
    
    // Limit history size
    if (this.history.stack.length > this.history.maxSize) {
      this.history.stack.shift();
    } else {
      this.history.index++;
    }

    this.updateUndoRedoUI();
  }

  /**
   * Undo to previous state
   */
  undo() {
    if (this.history.index > 0) {
      this.history.index--;
      this.applySnapshot(this.history.stack[this.history.index]);
    }
  }

  /**
   * Redo to next state
   */
  redo() {
    if (this.history.index < this.history.stack.length - 1) {
      this.history.index++;
      this.applySnapshot(this.history.stack[this.history.index]);
    }
  }

  /**
   * Apply history snapshot
   */
  applySnapshot(snapshot) {
    try {
      const project = JSON.parse(snapshot);
      this.history.isLocked = true;
      this.applyProject(project);
      this.history.isLocked = false;
      
      // Save to local storage
      this.saveToLocalStorage(snapshot);
      this.updateUndoRedoUI();
      
    } catch (error) {
      console.error('Failed to apply history snapshot:', error);
    }
  }

  /**
   * Lock/unlock history
   */
  lockHistory(locked = true) {
    this.history.isLocked = locked;
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
   * Get history state for debugging
   */
  getHistoryState() {
    return {
      stackSize: this.history.stack.length,
      currentIndex: this.history.index,
      canUndo: this.history.index > 0,
      canRedo: this.history.index < this.history.stack.length - 1,
      isLocked: this.history.isLocked
    };
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
    const fontFamilySelect = document.querySelector('#fontFamily');
    const fontSizeInput = document.querySelector('#fontSize');
    const fontColorInput = document.querySelector('#fontColor');
    const mapInput = document.getElementById('mapInput');
    
    // Apply slides
    if (Array.isArray(project.slides) && project.slides.length) {
      this.slides = project.slides;
      this.activeIndex = Math.min(Math.max(0, project.activeIndex || 0), project.slides.length - 1);
    } else {
      // Create default slide from legacy format
      const slide = {
        image: project.image || null,
        layers: project.layers || [],
        workSize: { w: 800, h: 450 },
        durationMs: 3000
      };
      this.slides = [slide];
      this.activeIndex = 0;
    }
    
    // Apply defaults to UI
    if (project.defaults) {
      if (fontFamilySelect && project.defaults.fontFamily) {
        fontFamilySelect.value = project.defaults.fontFamily;
      }
      if (fontSizeInput && project.defaults.fontSize) {
        fontSizeInput.value = project.defaults.fontSize;
      }
      if (fontColorInput && project.defaults.fontColor) {
        fontColorInput.value = project.defaults.fontColor;
      }
      this.defaults = project.defaults;
    }
    
    // Apply other state
    this.rsvpChoice = project.rsvp || 'none';
    this.mapQuery = project.mapQuery || '';
    
    if (mapInput) {
      mapInput.value = this.mapQuery;
    }
    
    this.updateRsvpUI();
  }

  // ===================
  // PERSISTENCE
  // ===================

  /**
   * Save current state
   */
  async save() {
    const projectData = {
      title: 'My Invitation',
      slides: this.slides,
      settings: {
        defaults: this.defaults,
        rsvp: this.rsvpChoice,
        mapQuery: this.mapQuery
      }
    };

    // In viewer mode, only save locally
    if (this.isViewer) {
      this.saveToLocalStorage();
      this.pushHistoryDebounced();
      return;
    }

    // Try backend save for authenticated users
    try {
      if (apiClient.token && this.currentProjectId) {
        // Check if project still exists
        try {
          await apiClient.getProject(this.currentProjectId);
          await apiClient.updateProject(this.currentProjectId, projectData);
          toast('Project updated');
        } catch (error) {
          // Project not found, create new one
          if (error.message?.includes('404') || error.message?.includes('Not Found')) {
            this.currentProjectId = null;
            const response = await apiClient.saveProject(projectData);
            if (response?.projectId) this.currentProjectId = response.projectId;
            toast('Project re-created in cloud');
          } else {
            throw error;
          }
        }
      } else if (apiClient.token) {
        // Create new project
        const response = await apiClient.saveProject(projectData);
        if (response?.projectId) this.currentProjectId = response.projectId;
        toast('Project saved to cloud');
      }
    } catch (error) {
      console.error('Backend save failed:', error);
      toast('Saved locally only');
    }
    
    // Always save locally as backup
    this.saveToLocalStorage();
    this.pushHistoryDebounced();
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
      // Try compressed save
      try {
        const project = this.buildProject();
        project.slides = project.slides.map(s => ({
          ...s,
          image: s.image ? { ...s.image, src: null } : null
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch (e2) {
        console.error('Even compressed save failed:', e2);
      }
    }
  }

  /**
   * Load from local storage
   */
  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      
      const project = JSON.parse(raw);
      this.lockHistory(true);
      this.applyProject(project);
      this.lockHistory(false);
      
      return true;
    } catch (error) {
      console.error('Failed to load from local storage:', error);
      return false;
    }
  }

  // ===================
  // UI HELPERS
  // ===================

  /**
   * Update RSVP UI
   */
  updateRsvpUI() {
    const rsvpYes = document.getElementById('rsvpYes');
    const rsvpMaybe = document.getElementById('rsvpMaybe');
    const rsvpNo = document.getElementById('rsvpNo');
    
    if (!rsvpYes || !rsvpMaybe || !rsvpNo) return;
    
    rsvpYes.classList.toggle('active', this.rsvpChoice === 'yes');
    rsvpMaybe.classList.toggle('active', this.rsvpChoice === 'maybe');
    rsvpNo.classList.toggle('active', this.rsvpChoice === 'no');
  }

  /**
   * Update undo/redo UI
   */
  updateUndoRedoUI() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (!undoBtn || !redoBtn) return;
    
    undoBtn.disabled = !(this.history.index > 0);
    redoBtn.disabled = !(this.history.index < this.history.stack.length - 1);
  }

  /**
   * Get map URL
   */
  getMapUrl() {
    const query = (this.mapQuery || '').trim();
    return 'https://www.google.com/maps/search/?api=1&query=' + 
           encodeURIComponent(query || 'event venue');
  }

  // ===================
  // UTILITIES
  // ===================

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      const value = source[key];

      // Don't recurse into DOM nodes or non-plain objects
      if (typeof Node !== 'undefined' && value instanceof Node) {
        result[key] = value;
      } else if (value && value.constructor === Object) {
        result[key] = this.deepMerge(target[key] || {}, value);
      } else {
        result[key] = value;
      }
    }

    return result;
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
      history: this.getHistoryState(),
      listeners: Array.from(this.listeners.keys()),
      projectId: this.currentProjectId
    };
  }
}

// Create singleton instance
const stateManager = new ApplicationStateManager();

// Create debounced save function
const saveProjectDebounced = debounce(() => stateManager.save(), 300);
const pushHistoryDebounced = debounce(() => stateManager.pushHistory(), 350);

// Backward compatibility - expose history state
export const historyState = {
  get stack() { return stateManager.history.stack; },
  get idx() { return stateManager.history.index; },
  get lock() { return stateManager.history.isLocked; },
  set lock(value) { stateManager.lockHistory(value); }
};

// Backward compatibility exports (maintain existing API)
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

// State getters (maintain existing API)
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

// State setters (maintain existing API)
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

// Advanced state management features
export const subscribe = (key, callback) => stateManager.subscribe(key, callback);
export const unsubscribe = (key, callback) => stateManager.unsubscribe(key, callback);
export const setState = (updates, options) => stateManager.setState(updates, options);
export const getState = (path) => stateManager.getState(path);

// Export manager instance for advanced usage
export { stateManager };
export default stateManager;