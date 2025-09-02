// state-manager.js - Application state management and persistence

import { apiClient } from './api-client.js';
import { debounce, toast, STORAGE_KEY, MAX_HISTORY } from './utils.js';

// Global application state
export let IS_VIEWER = false;
export let rsvpChoice = 'none';
export let mapQuery = '';
export let slides = [];
export let activeIndex = 0;
export let activeLayer = null;
export let playing = false;
export let rafId = 0;
export let slideStartTs = 0;
export let currentProjectId = null;

// History state for undo/redo
export const historyState = { stack: [], idx: -1, lock: false };

// State setters
export function setIsViewer(value) { IS_VIEWER = value; }
export function setRsvpChoice(choice) { rsvpChoice = choice; }
export function setMapQuery(query) { mapQuery = query; }
export function setSlides(newSlides) { slides = newSlides; }
export function setActiveIndex(index) { activeIndex = index; }
export function setActiveLayer(layer) { activeLayer = layer; }
export function setPlaying(isPlaying) { playing = isPlaying; }
export function setRafId(id) { rafId = id; }
export function setSlideStartTs(ts) { slideStartTs = ts; }

// State getters
export function getIsViewer() { return IS_VIEWER; }
export function getRsvpChoice() { return rsvpChoice; }
export function getMapQuery() { return mapQuery; }
export function getSlides() { return slides; }
export function getActiveIndex() { return activeIndex; }
export function getActiveLayer() { return activeLayer; }
export function getPlaying() { return playing; }
export function getRafId() { return rafId; }
export function getSlideStartTs() { return slideStartTs; }

// RSVP management
export function updateRsvpUI() {
  const rsvpYes = document.getElementById('rsvpYes');
  const rsvpMaybe = document.getElementById('rsvpMaybe');
  const rsvpNo = document.getElementById('rsvpNo');
  
  rsvpYes.classList.toggle('active', rsvpChoice === 'yes');
  rsvpMaybe.classList.toggle('active', rsvpChoice === 'maybe');
  rsvpNo.classList.toggle('active', rsvpChoice === 'no');
}

export function handleRsvpChoice(choice) {
  setRsvpChoice(choice);
  updateRsvpUI();
  saveProjectDebounced();
}

// Map management
export function getMapUrl() {
  const q = (mapQuery || '').trim();
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q || 'event venue');
}

export function handleMapQuery(query) {
  setMapQuery((query || '').trim());
  saveProjectDebounced();
}

// Project structure building
export function buildProject() {
  const fontFamilySelect = document.querySelector('#fontFamily');
  const fontSizeInput = document.querySelector('#fontSize');
  const fontColorInput = document.querySelector('#fontColor');
  
  return {
    v: 62,
    slides,
    activeIndex,
    defaults: {
      fontFamily: fontFamilySelect.value,
      fontSize: parseInt(fontSizeInput.value, 10) || 28,
      fontColor: fontColorInput.value
    },
    rsvp: rsvpChoice || 'none',
    mapQuery: mapQuery || ''
  };
}

// History management for undo/redo
export function updateUndoRedoUI() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  
  undoBtn.disabled = !(historyState.idx > 0);
  redoBtn.disabled = !(historyState.idx >= 0 && historyState.idx < historyState.stack.length - 1);
}

export function pushHistory() {
  if (historyState.lock) return;
  const snap = JSON.stringify(buildProject());
  if (historyState.idx >= 0 && historyState.stack[historyState.idx] === snap) {
    updateUndoRedoUI();
    return;
  }
  if (historyState.idx < historyState.stack.length - 1) {
    historyState.stack = historyState.stack.slice(0, historyState.idx + 1);
  }
  historyState.stack.push(snap);
  if (historyState.stack.length > MAX_HISTORY) {
    historyState.stack.shift();
  }
  historyState.idx = historyState.stack.length - 1;
  updateUndoRedoUI();
}

export const pushHistoryDebounced = debounce(pushHistory, 350);

// Project application from loaded data
export function applyProject(p) {
  const fontFamilySelect = document.querySelector('#fontFamily');
  const fontSizeInput = document.querySelector('#fontSize');
  const fontColorInput = document.querySelector('#fontColor');
  const mapInput = document.getElementById('mapInput');
  
  if (Array.isArray(p.slides) && p.slides.length) {
    slides = p.slides;
    activeIndex = Math.min(Math.max(0, p.activeIndex | 0), slides.length - 1);
  } else {
    const slide = {
      image: p.image || null,
      layers: p.layers || [],
      workSize: { w: 800, h: 450 }, // fallback workSize
      durationMs: 3000
    };
    slides = [slide];
    activeIndex = 0;
  }
  
  if (p.defaults) {
    if (p.defaults.fontFamily) fontFamilySelect.value = p.defaults.fontFamily;
    if (p.defaults.fontSize) fontSizeInput.value = p.defaults.fontSize;
    if (p.defaults.fontColor) fontColorInput.value = p.defaults.fontColor;
  }
  
  rsvpChoice = p.rsvp || 'none';
  updateRsvpUI();
  mapQuery = p.mapQuery || '';
  if (mapInput) mapInput.value = mapQuery;
}

export async function saveProject() {
  // Build the project data
  const projectData = {
    title: 'My Invitation', // You can make this editable later
    slides: getSlides(),
    settings: {
      defaults: {
        fontFamily: document.querySelector('#fontFamily')?.value || 'system-ui',
        fontSize: parseInt(document.querySelector('#fontSize')?.value, 10) || 28,
        fontColor: document.querySelector('#fontColor')?.value || '#ffffff'
      },
      rsvp: getRsvpChoice() || 'none',
      mapQuery: getMapQuery() || ''
    }
  };

  // Try to save to backend first
  try {
    if (apiClient.token) {
      if (currentProjectId) {
        await apiClient.updateProject(currentProjectId, projectData);
        toast('Project updated');
      } else {
        const response = await apiClient.saveProject(projectData);
        currentProjectId = response.projectId;
        toast('Project saved to cloud');
      }
    }
  } catch (error) {
    console.error('Backend save failed:', error);
    toast('Saved locally only');
  }
  
  // Always save locally as backup
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildProject()));
  } catch (err) {
    console.error('Local storage save failed:', err);
    // Try to save without images if storage is full
    try {
      const p = buildProject();
      p.slides = p.slides.map(s => ({
        ...s,
        image: s.image ? { ...s.image, src: null } : null
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch (e2) {
      console.error('Even compressed save failed:', e2);
    }
  }
  
  pushHistoryDebounced();
}

export const saveProjectDebounced = debounce(saveProject, 300);

export async function loadProject() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    slides = [{ image: null, layers: [], workSize: { w: 800, h: 450 }, durationMs: 3000 }];
    activeIndex = 0;
    return false;
  }
  let p;
  try {
    p = JSON.parse(raw);
  } catch {
    slides = [{ image: null, layers: [], workSize: { w: 800, h: 450 }, durationMs: 3000 }];
    activeIndex = 0;
    return false;
  }
  historyState.lock = true;
  applyProject(p);
  historyState.lock = false;
  return true;
}

// Undo/Redo functionality
export function applySnapshot(snap) {
  try {
    const p = JSON.parse(snap);
    historyState.lock = true;
    applyProject(p);
    historyState.lock = false;
    localStorage.setItem(STORAGE_KEY, snap);
    updateUndoRedoUI();
  } catch (e) {}
}

export function doUndo() {
  if (historyState.idx > 0) {
    historyState.idx -= 1;
    applySnapshot(historyState.stack[historyState.idx]);
  }
}

export function doRedo() {
  if (historyState.idx < historyState.stack.length - 1) {
    historyState.idx += 1;
    applySnapshot(historyState.stack[historyState.idx]);
  }
}

// Initialize history
export function initializeHistory() {
  historyState.lock = true;
  historyState.stack = [JSON.stringify(buildProject())];
  historyState.idx = 0;
  historyState.lock = false;
  updateUndoRedoUI();
}