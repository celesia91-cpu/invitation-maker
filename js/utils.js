// utils.js - Utility functions and helpers

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
  const r = work.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

// Time formatting
export function fmtSec(ms) {
  return (ms / 1000).toFixed(1) + 's';
}

// Toast notifications
export function toast(msg) {
  const statusText = document.getElementById('statusText');
  if (!statusText) {
    console.log(msg);
    return;
  }
  statusText.textContent = msg;
  setTimeout(() => statusText.textContent = '', 2000);
}

// URL parsing utilities
export function getUrlParams() {
  return new URLSearchParams(location.search);
}

export function getUrlHash() {
  return new URLSearchParams(location.hash.replace(/^#/, ''));
}

// Encoding/decoding for share functionality
export function encodeState(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

export function decodeState(encoded) {
  return JSON.parse(decodeURIComponent(escape(atob(encoded))));
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
    statusText: document.getElementById('statusText'),
    
    slidesStrip: document.getElementById('slidesStrip'),
    addSlideBtn: document.getElementById('addSlideBtn'),
    dupSlideBtn: document.getElementById('dupSlideBtn'),
    delSlideBtn: document.getElementById('delSlideBtn'),
    slideDur: document.getElementById('slideDur'),
    slideDurVal: document.getElementById('slideDurVal'),
    
    work: document.querySelector('#work'),
    vGuide: document.getElementById('vGuide'),
    hGuide: document.getElementById('hGuide'),
    userBgWrap: document.querySelector('#userBgWrap'),
    userBgEl: document.querySelector('#userBg'),
    fxVideo: document.querySelector('#fxVideo'),
    bgFileInput: document.querySelector('#bgFileInput'),
    uploadBgBtn: document.querySelector('#uploadBgBtn'),
    bgBox: document.querySelector('#bgBox'),
    
    rsvpYes: document.getElementById('rsvpYes'),
    rsvpMaybe: document.getElementById('rsvpMaybe'),
    rsvpNo: document.getElementById('rsvpNo'),
    rsvpMap: document.getElementById('rsvpMap'),
    
    mapInput: document.getElementById('mapInput'),
    mapOpenBtn: document.getElementById('mapOpenBtn'),
    mapCopyBtn: document.getElementById('mapCopyBtn'),
    mapGroup: document.getElementById('mapGroup'),
    
    fontFamilySelect: document.querySelector('#fontFamily'),
    fontSizeInput: document.querySelector('#fontSize'),
    fontColorInput: document.querySelector('#fontColor'),
    boldBtn: document.querySelector('#boldBtn'),
    italicBtn: document.querySelector('#italicBtn'),
    underlineBtn: document.querySelector('#underlineBtn'),
    textDeleteBtn: document.querySelector('#textDelete'),
    presetGrid: document.querySelector('#presetGrid'),
    addTextInput: document.querySelector('#addText'),
    addTextBtn: document.querySelector('#addTextBtn'),
    
    imgScale: document.querySelector('#imgScale'),
    imgScaleVal: document.querySelector('#imgScaleVal'),
    imgRotate: document.querySelector('#imgRotate'),
    imgRotateVal: document.querySelector('#imgRotateVal'),
    imgFlipBtn: document.querySelector('#imgFlip'),
    imgDeleteBtn: document.querySelector('#imgDelete'),
    
    textFadeInBtn: document.getElementById('textFadeInBtn'),
    textFadeOutBtn: document.getElementById('textFadeOutBtn'),
    textFadeInRange: document.getElementById('textFadeInRange'),
    textFadeOutRange: document.getElementById('textFadeOutRange'),
    textFadeInVal: document.getElementById('textFadeInVal'),
    textFadeOutVal: document.getElementById('textFadeOutVal'),
    
    imgFadeInBtn: document.getElementById('imgFadeInBtn'),
    imgFadeOutBtn: document.getElementById('imgFadeOutBtn'),
    imgFadeInRange: document.getElementById('imgFadeInRange'),
    imgFadeOutRange: document.getElementById('imgFadeOutRange'),
    imgFadeInVal: document.getElementById('imgFadeInVal'),
    imgFadeOutVal: document.getElementById('imgFadeOutVal')
  };
}

// Constants
export const STORAGE_KEY = 'invite_maker_project_v10_share';
export const DEFAULT_DUR = 3000;
export const MAX_HISTORY = 50;