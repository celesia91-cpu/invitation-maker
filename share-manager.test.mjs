import assert from 'node:assert';

function makeEl() {
  return {
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {},
    setAttribute() {},
    remove() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 100 }; },
    querySelectorAll() { return []; },
    querySelector() { return makeEl(); },
    addEventListener() {},
    removeEventListener() {},
    offsetWidth: 0,
    offsetHeight: 0,
  };
}

const userBgEl = {
  style: {},
  naturalWidth: 160,
  naturalHeight: 90,
  onload: null,
  onerror: null,
  set src(v) { this._src = v; if (this.onload) this.onload(); }
};

const workEl = {
  style: {},
  children: [],
  _rect: { width: 200, height: 100 },
  getBoundingClientRect() { return this._rect; },
  querySelectorAll() { return this.children; },
  appendChild(el) {
    this.children.push(el);
    el.remove = () => {
      const idx = this.children.indexOf(el);
      if (idx !== -1) this.children.splice(idx, 1);
    };
  },
};

const elements = {
  '#userBg': userBgEl,
  '#work': workEl,
  '#userBgWrap': makeEl(),
  '#bgBox': makeEl(),
  '#fxVideo': { videoWidth: 400, videoHeight: 200 }
};

let isViewer = false;
const fullscreenListeners = [];
global.document = {
  querySelector(sel) { return elements[sel] || makeEl(); },
  querySelectorAll() { return []; },
  getElementById(id) { return elements['#' + id] || makeEl(); },
  body: {
    classList: {
      contains(cls) { return cls === 'viewer' ? isViewer : false; },
      add(cls) { if (cls === 'viewer') isViewer = true; },
      remove(cls) { if (cls === 'viewer') isViewer = false; },
      toggle() {}
    }
  },
  createElement() { return makeEl(); },
  addEventListener(type, cb) { if (type === 'fullscreenchange') fullscreenListeners.push(cb); },
  removeEventListener() {},
  dispatchFullscreen() { fullscreenListeners.forEach(cb => cb()); }
};

global.window = { addEventListener() {}, removeEventListener() {}, location: { hostname: 'localhost' } };
global.fetch = async () => ({ ok: true, json: async () => ({}) });

await import('./share-manager.js');
const { setTransforms, imgState } = await import('./image-manager.js');
const { setSlides, setActiveIndex } = await import('./state-manager.js');
assert.ok(fullscreenListeners.length > 0);

// Test default centering
const slide1 = { image: { src: 'foo.jpg' } };
await window.loadSlideImage(slide1);
assert.strictEqual(Math.round(slide1.image.cxPercent), 50);
assert.strictEqual(Math.round(slide1.image.cyPercent), 50);
assert.strictEqual(imgState.scale, 0.5);

// Test preserving existing transforms
const slide2 = { image: { src: 'foo.jpg', cxPercent: 10, cyPercent: 20, scale: 0.5, angle: 0.1, shearX: 0.2, shearY: 0.3, signX: -1, signY: 1, flip: true } };
await window.loadSlideImage(slide2);
assert.strictEqual(slide2.image.cxPercent, 10);
assert.strictEqual(slide2.image.cyPercent, 20);
assert.strictEqual(slide2.image.scale, 0.5);
assert.strictEqual(slide2.image.angle, 0.1);
assert.strictEqual(slide2.image.shearX, 0.2);
assert.strictEqual(slide2.image.shearY, 0.3);
assert.strictEqual(slide2.image.signX, -1);
assert.strictEqual(slide2.image.signY, 1);
assert.strictEqual(slide2.image.flip, true);

console.log('loadSlideImage centers and preserves transforms');

// Test rotation preserves center when image is near the edge
const slide3 = { image: { src: 'foo.jpg' } };
await window.loadSlideImage(slide3);
imgState.cx = 50;
imgState.cy = 50;
imgState.angle = Math.PI / 2; // 90 degrees
setTransforms();
assert.strictEqual(imgState.cx, 50);
assert.strictEqual(imgState.cy, 50);
console.log('rotation preserves center');

// Test percentage-based positioning without scale uses getFxScale fallback
const slide4 = { image: { src: 'foo.jpg', cxPercent: 25, cyPercent: 25 } };
await window.loadSlideImage(slide4);
assert.strictEqual(slide4.image.scale, 0.5);
console.log('percentage positioning falls back to getFxScale');

// Alignment tests across multiple viewport ratios
userBgEl.naturalWidth = 100;
userBgEl.naturalHeight = 100;

const baseSlide = {
  image: {
    src: 'foo.jpg',
    cxPercent: 50,
    cyPercent: 50,
    scale: 1,
    originalWidth: 100,
    originalHeight: 100
  }
};

const textLayer = {
  text: 'Center',
  left: 50,
  top: 50,
  fontSize: 10,
  workWidth: 100,
  workHeight: 100
};

// Scenario 1: wide viewport
workEl._rect = { width: 200, height: 100 };
workEl.children = [];
await window.loadSlideImage(baseSlide);
await window.loadTextLayers([textLayer]);
let layer = workEl.children[0];
assert.strictEqual(parseFloat(layer.style.left), imgState.cx);
assert.strictEqual(parseFloat(layer.style.top), imgState.cy);

// Scenario 2: tall viewport
workEl._rect = { width: 100, height: 200 };
workEl.children = [];
await window.loadSlideImage(baseSlide);
await window.loadTextLayers([textLayer]);
layer = workEl.children[0];
assert.strictEqual(parseFloat(layer.style.left), imgState.cx);
assert.strictEqual(parseFloat(layer.style.top), imgState.cy);

console.log('text and image layers align across viewport ratios');

// Test rescaling on fullscreen change
const fsSlide = {
  image: {
    src: 'foo.jpg',
    cxPercent: 50,
    cyPercent: 50,
    scale: 1,
    originalWidth: 100,
    originalHeight: 100
  }
};
workEl._rect = { width: 100, height: 100 };
setSlides([fsSlide]);
setActiveIndex(0);
global.document.body.classList.add('viewer');
await window.loadSlideImage(fsSlide);
assert.strictEqual(imgState.scale, 1);
workEl._rect = { width: 200, height: 100 };
global.document.dispatchFullscreen();
assert.strictEqual(imgState.cx, 100);
assert.strictEqual(imgState.cy, 50);
assert.strictEqual(imgState.scale, 2);
console.log('rescaleViewerContent updates image on fullscreen change');

// --- ResponsiveManager initialization in viewer mode ---
let resizeObserverCount = 0;
global.ResizeObserver = class {
  constructor(cb) {
    resizeObserverCount++;
    this.cb = cb;
  }
  observe() {}
};

global.CSS = { supports: () => false };

window.visualViewport = { width: 200, height: 100, offsetLeft: 5, offsetTop: 10, addEventListener() {}, removeEventListener() {} };
window.innerWidth = 200;
window.innerHeight = 100;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

global.location = { search: '?view', hash: '', origin: 'http://localhost' };
window.location = global.location;

isViewer = false;
global.document.body.classList.remove('viewer');

const { applyViewerFromUrl } = await import('./share-manager.js');
applyViewerFromUrl();

// Allow async initialization to complete
await new Promise(r => setTimeout(r, 0));

assert.strictEqual(resizeObserverCount, 1);
assert.strictEqual(workEl.style.left, '5px');
assert.strictEqual(workEl.style.top, '10px');

console.log('applyViewerFromUrl initializes ResponsiveManager in viewer mode');
