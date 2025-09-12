import assert from 'node:assert';

function makeEl() {
  return {
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {},
    setAttribute() {},
    remove() {},
    getBoundingClientRect() { return { width: workWidth, height: workHeight }; },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
  };
}

let workWidth = 100;
let workHeight = 100;
const textEl = {
  style: { left: '50px', top: '50px', width: '100px', fontSize: '20px' },
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
};

const workEl = {
  style: {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  querySelectorAll() { return [textEl]; },
  getBoundingClientRect() { return { width: workWidth, height: workHeight }; }
};

const elements = {
  '#work': workEl,
  '#userBgWrap': makeEl(),
  '#bgBox': makeEl(),
  '#userBg': makeEl()
};

const fullscreenListeners = [];

global.document = {
  querySelector(sel) { return elements[sel] || makeEl(); },
  getElementById(id) { return elements['#' + id] || makeEl(); },
  body: { classList: { contains() { return false; }, add() {}, remove() {}, toggle() {} } },
  addEventListener(type, cb) { if (type === 'fullscreenchange') fullscreenListeners.push(cb); },
  removeEventListener() {},
  dispatchFullscreen() { fullscreenListeners.forEach(cb => cb()); }
};

global.window = {
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 100,
  innerHeight: 100,
  matchMedia(query) {
    return {
      matches: query.includes('landscape'),
      addEventListener() {},
      removeEventListener() {}
    };
  },
  visualViewport: {
    width: 100,
    height: 100,
    offsetLeft: 0,
    offsetTop: 0,
    addEventListener() {},
    removeEventListener() {}
  },
  location: { hostname: 'localhost' }
};

global.CSS = { supports() { return false; } };

global.requestAnimationFrame = (cb) => cb();

global.performance = { now: () => Date.now() };

global.sessionStorage = { getItem() {}, setItem() {}, removeItem() {} };
global.getComputedStyle = (el) => ({ fontSize: el.style.fontSize });

global.ResizeObserver = class {
  constructor(cb) { this.cb = cb; }
  observe() {}
  disconnect() {}
};

const { imgState } = await import('./image-manager.js');

const { ResponsiveManager } = await import('./responsive-manager.js');
const { default: stateManager, initializeHistory, setSlides, historyState } = await import('./state-manager.js');

const rm = new ResponsiveManager();
rm.isInitialized = true;
rm.setLastWorkWidth(workWidth);
rm.updateRotateOverlay = () => {};
rm.scheduleSave = () => {};
rm.syncToolbarAfterScaling = async () => {};

imgState.has = true;
imgState.cx = 50;
imgState.cy = 50;
imgState.scale = 1;

// Simulate viewport width change
workWidth = 200;
window.visualViewport.width = 200;
await rm.handleWorkResize();

assert.strictEqual(textEl.style.left, '100px');
assert.strictEqual(textEl.style.top, '100px');
assert.strictEqual(textEl.style.width, '200px');
assert.strictEqual(imgState.cx, 100);
assert.strictEqual(imgState.scale, 2);

// Simulate orientation change with safe area offsets
workWidth = 300;
window.visualViewport.width = 300;
window.visualViewport.offsetLeft = 20;
window.visualViewport.offsetTop = 10;
window.innerWidth = 320;
window.innerHeight = 480;
rm.updateRotateOverlay();
rm.applySafeAreaInsets();
await rm.forceResizeCheck();

assert.strictEqual(textEl.style.left, '150px');
assert.strictEqual(textEl.style.top, '150px');
assert.strictEqual(textEl.style.width, '300px');
assert.strictEqual(imgState.cx, 150);
assert.strictEqual(imgState.scale, 3);
assert.strictEqual(workEl.style.left, '20px');
assert.strictEqual(workEl.style.top, '10px');

console.log('ResponsiveManager scales elements and applies safe area offsets correctly');

// Allow any pending history operations to complete
await new Promise(r => setTimeout(r, 600));

// --- History recording during rapid resize ---
stateManager.reset();
initializeHistory();
setSlides([{ image: null, layers: [], workSize: { w: 100, h: 100 }, durationMs: 3000 }]);

workWidth = 400;
window.visualViewport.width = 400;
await rm.handleWorkResize();
workWidth = 500;
window.visualViewport.width = 500;
await rm.handleWorkResize();
workWidth = 600;
window.visualViewport.width = 600;
await rm.handleWorkResize();

await new Promise(r => setTimeout(r, 1000));
assert.strictEqual(historyState.stack.length, 2);
console.log('recordHistoryAfterResize prevents extra history entries during rapid resizes');

// --- fullscreenchange triggers resize handler ---
const rmFullscreen = new ResponsiveManager();
rmFullscreen.updateRotateOverlay = () => {};
rmFullscreen.scheduleSave = () => {};
workWidth = 100;
window.visualViewport.width = 100;
await rmFullscreen.initialize();

const fsTextEl = {
  style: { left: '10px', top: '10px', width: '20px', fontSize: '10px' },
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
};
workEl.querySelectorAll = () => [fsTextEl];

workWidth = 200;
window.visualViewport.width = 200;
document.dispatchFullscreen();
await new Promise(r => setTimeout(r, 0));

assert.strictEqual(fsTextEl.style.left, '20px');
assert.strictEqual(fsTextEl.style.width, '40px');
console.log('fullscreenchange triggers handleWorkResize');
