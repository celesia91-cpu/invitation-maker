// state-manager.js - COMPLETE FIXED VERSION - All exports included

import { apiClient } from './api-client.js';
import { debounce, STORAGE_KEY, MAX_HISTORY } from './utils.js';

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

    // Determine new state based on merge option
    const newState = merge
      ? this.deepMerge(this.state, updates)
      : { ...this.state, ...updates };

    // Store previous state for change detection
    const previousState = { ...this.state };

    // Update state
    this.state = newState;
    
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
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, this.state);
    
    target[lastKey] = value;
  }

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
      } else if (Array.isArray(value)) {
        // Shallow-copy arrays to avoid reference sharing
        result[key] = [...value];
      } else if (
        value !== null &&
        typeof value === 'object' &&
        value.constructor === Object
      ) {
        // Recursively merge only plain objects
        result[key] = this.deepMerge(target[key] || {}, value);
      } else {
        // Functions, class instances, primitives, etc.
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Validate state updates
   */
  validateStateUpdates(updates) {
    // Basic validation rules
    if (typeof updates !== 'object' || updates === null) {
      return false;
    }

    // Validate specific fields
    if ('activeIndex' in updates && typeof updates.activeIndex !== 'number') {
      return false;
    }

    if ('slides' in updates && !Array.isArray(updates.slides)) {
      return false;
    }

    return true;
  }

  /**
   * Notify state change listeners
   */
  notifyStateChange(previousState, newState, updates) {
    this.listeners.forEach((callback, key) => {
      try {
        callback(newState, previousState, updates);
      } catch (error) {
        console.error(`State listener ${key} failed:`, error);
      }
    });
  }

  /**
   * Add state change listener
   */
  addListener(key, callback) {
    this.listeners.set(key, callback);
  }

  /**
   * Remove state change listener
   */
  removeListener(key) {
    this.listeners.delete(key);
  }

  // ===================
  // HISTORY MANAGEMENT
  // ===================

  /**
   * Push current state to history stack
   */
  pushHistory(description = 'State change') {
    if (this.history.isLocked) return;

    const snapshot = {
      state: JSON.parse(JSON.stringify(this.state)),
      timestamp: Date.now(),
      description
    };

    // Remove any future states if we're not at the end
    if (this.history.index < this.history.stack.length - 1) {
      this.history.stack = this.history.stack.slice(0, this.history.index + 1);
    }

    // Add new state
    this.history.stack.push(snapshot);

    // Limit stack size
    if (this.history.stack.length > this.history.maxSize) {
      this.history.stack.shift();
    } else {
      this.history.index++;
    }
  }

  /**
   * Undo last state change
   */
  undo() {
    if (this.history.index <= 0) return false;

    this.history.index--;
    const snapshot = this.history.stack[this.history.index];
    
    this.lockHistory(true);
    this.setState(snapshot.state, { merge: false });
    this.lockHistory(false);

    return true;
  }

  /**
   * Redo next state change
   */
  redo() {
    if (this.history.index >= this.history.stack.length - 1) return false;

    this.history.index++;
    const snapshot = this.history.stack[this.history.index];
    
    this.lockHistory(true);
    this.setState(snapshot.state, { merge: false });
    this.lockHistory(false);

    return true;
  }

  /**
   * Lock/unlock history to prevent recursive updates
   */
  lockHistory(locked) {
    this.history.isLocked = locked;
  }

  // ===================
  // PERSISTENCE
  // ===================

  /**
   * Save state to localStorage
   */
  saveToLocalStorage() {
    try {
      const project = {
        slides: this.state.slides,
        activeIndex: this.state.activeIndex,
        rsvpChoice: this.state.rsvpChoice,
        mapQuery: this.state.mapQuery,
        lastSaved: Date.now()
      };

      // Try to save full project first
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        console.log('✅ Project saved to local storage');
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          // Try to save compressed version
          const compressedProject = {
            ...project,
            slides: project.slides.map(s => ({
              ...s,
              image: s.image ? { ...s.image, src: null } : null
            }))
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(compressedProject));
          console.log('✅ Project saved to local storage (compressed)');
        } else {
          throw e;
        }
      }
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      
      const project = JSON.parse(raw);
      
      this.lockHistory(true);
      this.setState({
        slides: project.slides || [],
        activeIndex: project.activeIndex || 0,
        rsvpChoice: project.rsvpChoice || 'none',
        mapQuery: project.mapQuery || ''
      });
      this.lockHistory(false);
      
      console.log('✅ Project loaded from local storage');
      return true;
    } catch (error) {
      console.error('Failed to load from local storage:', error);
      return false;
    }
  }

  // ===================
  // PROJECT MANAGEMENT
  // ===================

  /**
   * Save project to backend
   */
  async saveProject() {
    if (!apiClient.isAuthenticated()) {
      console.log('Not authenticated, saving locally only');
      this.saveToLocalStorage();
      return;
    }

    try {
      const projectData = {
        slides: this.state.slides,
        settings: {
          activeIndex: this.state.activeIndex,
          rsvpChoice: this.state.rsvpChoice,
          mapQuery: this.state.mapQuery
        }
      };

      let response;
      if (this.state.currentProjectId) {
        response = await apiClient.updateProject(this.state.currentProjectId, projectData);
      } else {
        response = await apiClient.createProject(projectData);
        this.setState({ currentProjectId: response.project.id });
      }

      console.log('✅ Project saved to backend');
      return response;
    } catch (error) {
      console.error('Failed to save project to backend:', error);
      // Fallback to local storage
      this.saveToLocalStorage();
      throw error;
    }
  }

  /**
   * Load project from backend
   */
  async loadProject(projectId) {
    if (!apiClient.isAuthenticated()) {
      console.log('Not authenticated, loading from local storage');
      return this.loadFromLocalStorage();
    }

    try {
      const response = await apiClient.getProject(projectId);
      const { project } = response;

      this.lockHistory(true);
      this.setState({
        slides: project.slides || [],
        activeIndex: project.settings?.activeIndex || 0,
        rsvpChoice: project.settings?.rsvpChoice || 'none',
        mapQuery: project.settings?.mapQuery || '',
        currentProjectId: project.id
      });
      this.lockHistory(false);

      console.log('✅ Project loaded from backend');
      return true;
    } catch (error) {
      console.error('Failed to load project from backend:', error);
      // Fallback to local storage
      return this.loadFromLocalStorage();
    }
  }
}

// Create singleton state manager
const stateManager = new ApplicationStateManager();

// ===================
// EXPORTED FUNCTIONS
// ===================

// Basic state accessors
export function getSlides() {
  return stateManager.getState('slides') || [];
}

export function setSlides(slides) {
  stateManager.setState({ slides });
  stateManager.saveToLocalStorage();
}

export function getActiveIndex() {
  return stateManager.getState('activeIndex') || 0;
}

export function setActiveIndex(index) {
  stateManager.setState({ activeIndex: index });
}

// FIXED: Add missing getSlideImage function
export function getSlideImage() {
  const slides = getSlides();
  const activeIndex = getActiveIndex();
  const slide = slides[activeIndex];
  return slide?.image || null;
}

// Additional state accessors
export function getIsViewer() {
  return stateManager.getState('isViewer') || false;
}

export function setIsViewer(isViewer) {
  stateManager.setState({ isViewer });
}

export function getRsvpChoice() {
  return stateManager.getState('rsvpChoice') || 'none';
}

export function setRsvpChoice(choice) {
  stateManager.setState({ rsvpChoice: choice });
  stateManager.saveToLocalStorage();
}

export function getMapQuery() {
  return stateManager.getState('mapQuery') || '';
}

export function setMapQuery(query) {
  stateManager.setState({ mapQuery: query });
  stateManager.saveToLocalStorage();
}

export function getActiveLayer() {
  return stateManager.getState('activeLayer');
}

export function setActiveLayer(layer) {
  stateManager.setState({ activeLayer: layer });
}

// Project management
export async function loadProject() {
  return stateManager.loadFromLocalStorage();
}

export async function saveProject() {
  return stateManager.saveProject();
}

export const saveProjectDebounced = debounce(() => {
  stateManager.saveToLocalStorage();
}, 500);

// History management
export function initializeHistory() {
  // Push initial state to history
  stateManager.pushHistory('Initial state');
  
  console.log('✅ History system initialized');
}

export function undo() {
  const success = stateManager.undo();
  if (success) {
    console.log('↶ Undo successful');
    // Trigger UI updates
    window.dispatchEvent(new CustomEvent('stateChanged', { 
      detail: { type: 'undo', state: stateManager.getState() }
    }));
  }
  return success;
}

export function redo() {
  const success = stateManager.redo();
  if (success) {
    console.log('↷ Redo successful');
    // Trigger UI updates
    window.dispatchEvent(new CustomEvent('stateChanged', { 
      detail: { type: 'redo', state: stateManager.getState() }
    }));
  }
  return success;
}

export function pushHistory(description) {
  stateManager.pushHistory(description);
}

// State listeners
export function addStateListener(key, callback) {
  stateManager.addListener(key, callback);
}

export function removeStateListener(key) {
  stateManager.removeListener(key);
}

// Utility to get the state manager instance
export function getStateManager() {
  return stateManager;
}

// Apply project data to current state
export function applyProject(projectData) {
  stateManager.lockHistory(true);
  stateManager.setState({
    slides: projectData.slides || [],
    activeIndex: projectData.activeIndex || 0,
    rsvpChoice: projectData.rsvpChoice || 'none',
    mapQuery: projectData.mapQuery || ''
  });
  stateManager.lockHistory(false);
  
  console.log('✅ Project data applied to state');
}

// Reset state to defaults
export function resetState() {
  stateManager.lockHistory(true);
  stateManager.setState({
    slides: [],
    activeIndex: 0,
    activeLayer: null,
    playing: false,
    rafId: 0,
    slideStartTs: 0,
    rsvpChoice: 'none',
    mapQuery: '',
    currentProjectId: null
  }, { merge: false });
  stateManager.lockHistory(false);
  
  console.log('✅ State reset to defaults');
}

// Get current project data for export
export function getProjectData() {
  return {
    slides: getSlides(),
    activeIndex: getActiveIndex(),
    rsvpChoice: getRsvpChoice(),
    mapQuery: getMapQuery(),
    lastModified: Date.now()
  };
}

// Initialize state management
console.log('✅ State manager initialized');

// Make state manager available globally for debugging
if (typeof window !== 'undefined') {
  window.stateManager = stateManager;
}