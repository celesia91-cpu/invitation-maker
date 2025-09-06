// Enhanced utils.js with better encoding for sharing

// Math and validation utilities
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Debounce utility for performance
export function debounce(fn, delay = 300) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), delay);
  };
}

// Color conversion utilities
export function rgbToHex(rgb) {
  const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return rgb;
  return '#' + [m[1], m[2], m[3]].map(n => ('0' + parseInt(n).toString(16)).slice(-2)).join('');
}

// Font weight detection
export function isBold(cs) {
  const w = cs.fontWeight;
  const n = parseInt(w, 10);
  return (w === 'bold') || (!Number.isNaN(n) && n >= 600);
}

// DOM utilities
export function workSize() {
  const work = document.querySelector('#work');
  if (!work) {
    console.warn('workSize: #work element not found');
    return { w: 0, h: 0 };
  }
  const r = work.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

// Time formatting
export function fmtSec(ms) {
  return (ms / 1000).toFixed(1) + 's';
}

// URL parsing utilities
export function getUrlParams() {
  return new URLSearchParams(location.search);
}

export function getUrlHash() {
  return new URLSearchParams(location.hash.replace(/^#/, ''));
}

// State encoding/decoding for sharing
export function encodeState(obj) {
  try {
    const json = JSON.stringify(obj);
    console.log('Encoding object, JSON length:', json.length);

    // Try to compress by removing unnecessary whitespace and optimizing data
    const compressed = compressProjectData(obj);
    const compressedJson = JSON.stringify(compressed);
    console.log('Compressed JSON length:', compressedJson.length);

    // Use the compressed version if significantly smaller
    const finalJson = compressedJson.length < json.length * 0.8 ? compressedJson : json;

    // Convert JSON to bytes
    const bytes = new TextEncoder().encode(finalJson);

    // Base64-encode the byte array
    let encoded;
    if (typeof btoa === 'function') {
      let binary = '';
      for (const b of bytes) binary += String.fromCharCode(b);
      encoded = btoa(binary);
    } else if (typeof Buffer !== 'undefined') {
      encoded = Buffer.from(bytes).toString('base64');
    } else {
      throw new Error('No base64 encoder available');
    }

    console.log('Final encoded length:', encoded.length);
    return encoded;
  } catch (error) {
    console.error('Encoding failed:', error);
    // Fallback to basic encoding
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(obj));
      if (typeof btoa === 'function') {
        let binary = '';
        for (const b of bytes) binary += String.fromCharCode(b);
        return btoa(binary);
      }
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(bytes).toString('base64');
      }
      throw new Error('No base64 encoder available');
    } catch (fallbackError) {
      console.error('Fallback encoding failed:', fallbackError);
      throw new Error('Failed to encode project data');
    }
  }
}

export function decodeState(encoded) {
  try {
    // Base64-decode to bytes
    let bytes;
    if (typeof atob === 'function') {
      const binary = atob(encoded);
      bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    } else if (typeof Buffer !== 'undefined') {
      bytes = Buffer.from(encoded, 'base64');
    } else {
      throw new Error('No base64 decoder available');
    }

    // Recover the JSON string from bytes
    const json = new TextDecoder().decode(bytes);
    const decoded = JSON.parse(json);
    console.log('Successfully decoded project data');
    return decoded;
  } catch (error) {
    console.error('Decoding failed:', error);
    throw new Error('Invalid or corrupted share link');
  }
}

// Compress project data for sharing
function compressProjectData(project) {
  const compressed = {
    v: project.v,
    slides: project.slides?.map(slide => ({
      // Keep essential data only
      image: slide.image ? {
        // Remove src for data URLs, keep remote URLs
        src: (slide.image.src && slide.image.src.startsWith('http')) ? slide.image.src : null,
        thumb: slide.image.thumb,
        cx: Math.round((slide.image.cx || 0) * 100) / 100, // Round to 2 decimal places
        cy: Math.round((slide.image.cy || 0) * 100) / 100,
        scale: Math.round((slide.image.scale || 1) * 1000) / 1000, // Round to 3 decimal places
        angle: Math.round((slide.image.angle || 0) * 100) / 100,
        flip: slide.image.flip || false,
        fadeInMs: slide.image.fadeInMs,
        fadeOutMs: slide.image.fadeOutMs,
        zoomInMs: slide.image.zoomInMs,
        zoomOutMs: slide.image.zoomOutMs
      } : null,
      layers: slide.layers?.map(layer => ({
        text: layer.text,
        left: Math.round(layer.left || 0),
        top: Math.round(layer.top || 0),
        width: layer.width,
        fontSize: layer.fontSize !== 28 ? layer.fontSize : undefined, // Remove default
        fontFamily: layer.fontFamily === 'system-ui' ? undefined : layer.fontFamily, // Remove default
        color: layer.color === '#ffffff' ? undefined : layer.color, // Remove default
        fontWeight: layer.fontWeight === '400' || layer.fontWeight === 'normal' ? undefined : layer.fontWeight,
        fontStyle: layer.fontStyle === 'normal' ? undefined : layer.fontStyle,
        textDecoration: layer.textDecoration === 'none' ? undefined : layer.textDecoration,
        padding: layer.padding === '4px 6px' ? undefined : layer.padding, // Remove default
        fadeInMs: layer.fadeInMs,
        fadeOutMs: layer.fadeOutMs,
        zoomInMs: layer.zoomInMs,
        zoomOutMs: layer.zoomOutMs
      })) || [],
      workSize: slide.workSize,
      durationMs: slide.durationMs
    })) || [],
    activeIndex: project.activeIndex,
    defaults: project.defaults,
    rsvp: project.rsvp === 'none' ? undefined : project.rsvp, // Remove default
    mapQuery: project.mapQuery || undefined
  };
  
  // Remove undefined values to reduce size
  return JSON.parse(JSON.stringify(compressed));
}

// Check if URL would be too long
export function checkUrlLength(url) {
  const maxLength = 2048; // Safe length for most browsers
  if (url.length > maxLength) {
    console.warn(`URL length (${url.length}) exceeds safe limit (${maxLength})`);
    return false;
  }
  return true;
}

// DOM element getters
export function getElements() {
  return {
    body: document.body,
    topbar: document.getElementById('topbar'),
    topbarToggle: document.getElementById('topbarToggle'),
    backdrop: document.getElementById('backdrop'),
    togglePanelBtn: document.getElementById('togglePanelBtn'),
    previewBtn: document.getElementById('previewBtn'),
    
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
    
    prevSlideBtn: document.getElementById('prevSlideBtn'),
    nextSlideBtn: document.getElementById('nextSlideBtn'),
    playSlidesBtn: document.getElementById('playSlidesBtn'),
    slideLabel: document.getElementById('slideLabel'),
    
    shareBtn: document.getElementById('shareBtn'),

    slidesStrip: document.getElementById('slidesStrip'),
    addSlideBtn: document.getElementById('addSlideBtn'),
    dupSlideBtn: document.getElementById('dupSlideBtn'),
    delSlideBtn: document.getElementById('delSlideBtn'),
    slideDur: document.getElementById('slideDur'),
    slideDurVal: document.getElementById('slideDurVal'),
    
    work: document.querySelector('#work'),
    vGuide: document.querySelector('#vGuide'),
    hGuide: document.querySelector('#hGuide'),
    
    fileInput: document.getElementById('fileInput'),
    fileInputBtn: document.getElementById('fileInputBtn'),
    imgDelete: document.querySelector('#imgDelete'),
    
    textFadeInBtn: document.getElementById('textFadeInBtn'),
    textFadeOutBtn: document.getElementById('textFadeOutBtn'),
    textFadeInRange: document.getElementById('textFadeInRange'),
    textFadeOutRange: document.getElementById('textFadeOutRange'),
    textFadeInVal: document.getElementById('textFadeInVal'),
    textFadeOutVal: document.getElementById('textFadeOutVal'),
    textZoomInBtn: document.getElementById('textZoomInBtn'),
    textZoomOutBtn: document.getElementById('textZoomOutBtn'),
    textZoomInRange: document.getElementById('textZoomInRange'),
    textZoomOutRange: document.getElementById('textZoomOutRange'),
    textZoomInVal: document.getElementById('textZoomInVal'),
    textZoomOutVal: document.getElementById('textZoomOutVal'),

    imgFadeInBtn: document.getElementById('imgFadeInBtn'),
    imgFadeOutBtn: document.getElementById('imgFadeOutBtn'),
    imgFadeInRange: document.getElementById('imgFadeInRange'),
    imgFadeOutRange: document.getElementById('imgFadeOutRange'),
    imgFadeInVal: document.getElementById('imgFadeInVal'),
    imgFadeOutVal: document.getElementById('imgFadeOutVal'),
    imgZoomInBtn: document.getElementById('imgZoomInBtn'),
    imgZoomOutBtn: document.getElementById('imgZoomOutBtn'),
    imgZoomInRange: document.getElementById('imgZoomInRange'),
    imgZoomOutRange: document.getElementById('imgZoomOutRange'),
    imgZoomInVal: document.getElementById('imgZoomInVal'),
    imgZoomOutVal: document.getElementById('imgZoomOutVal'),

    // Font controls
    fontFamily: document.getElementById('fontFamily'),
    fontSize: document.getElementById('fontSize'),
    fontColor: document.getElementById('fontColor'),
    
    // RSVP elements
    rsvpYes: document.getElementById('rsvpYes'),
    rsvpMaybe: document.getElementById('rsvpMaybe'),
    rsvpNo: document.getElementById('rsvpNo'),
    rsvpMap: document.getElementById('rsvpMap'),
    
    // Map controls
    mapInput: document.getElementById('mapInput'),
    mapGroup: document.getElementById('mapGroup'),
    
    // Layer controls
    addTextBtn: document.getElementById('addTextBtn'),
    
    // Panel controls
    panel: document.getElementById('panel'),
    panelBackdrop: document.getElementById('panelBackdrop')
  };
}

// Image utilities
export function getImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

// File utilities
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Text utilities
export function sanitizeText(text) {
  return text.replace(/<[^>]*>/g, '').trim();
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Animation utilities
export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

// Device detection
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Keyboard utilities
export function isModifierKey(event) {
  return event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
}

export function getKeyCombo(event) {
  const keys = [];
  if (event.ctrlKey || event.metaKey) keys.push('cmd');
  if (event.altKey) keys.push('alt');
  if (event.shiftKey) keys.push('shift');
  keys.push(event.key.toLowerCase());
  return keys.join('+');
}

// Local storage utilities
export function safeLocalStorage() {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: (key) => localStorage.removeItem(key),
      clear: () => localStorage.clear()
    };
  } catch (e) {
    // Fallback for when localStorage is not available
    const storage = {};
    return {
      getItem: (key) => storage[key] || null,
      setItem: (key, value) => storage[key] = value,
      removeItem: (key) => delete storage[key],
      clear: () => Object.keys(storage).forEach(key => delete storage[key])
    };
  }
}

// Performance utilities
export function requestIdleCallback(callback, options = {}) {
  if (window.requestIdleCallback) {
    return window.requestIdleCallback(callback, options);
  }
  // Fallback for browsers without requestIdleCallback
  return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1);
}

export function cancelIdleCallback(id) {
  if (window.cancelIdleCallback) {
    return window.cancelIdleCallback(id);
  }
  return clearTimeout(id);
}

// Constants
export const STORAGE_KEY = 'invite_maker_project_v10_share';
export const DEFAULT_DUR = 3000;
export const MAX_HISTORY = 50;

// Default fonts
export const DEFAULT_FONTS = [
  'system-ui',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Helvetica',
  'Dancing Script',
  'Pacifico',
  'Shadows Into Light'
];

// Color constants
export const DEFAULT_COLORS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
];

// Animation constants
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
};

// Breakpoints
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1200
};

// Z-index constants
export const Z_INDEX = {
  BACKDROP: 1000,
  MODAL: 1010,
  TOOLTIP: 1020,
  DROPDOWN: 1030
};