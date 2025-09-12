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

global.document = {
  querySelector(sel) { return elements[sel] || makeEl(); },
  getElementById(id) { return elements['#' + id] || makeEl(); },
  body: { classList: { contains() { return false; }, add() {}, remove() {}, toggle() {} } }
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

const { imgState } = await import('./image-manager.js');

const { ResponsiveManager } = await import('./responsive-manager.js');

const rm = new ResponsiveManager();
rm.isInitialized = true;
rm.setLastWorkWidth(workWidth);
rm.updateRotateOverlay = () => {};
rm.scheduleSave = () => {};
rm.syncToolbarAfterScaling = () => {};

imgState.has = true;
imgState.cx = 50;
imgState.cy = 50;
imgState.scale = 1;

// Simulate viewport width change
workWidth = 200;
window.visualViewport.width = 200;
rm.handleWorkResize();
await new Promise(r => setTimeout(r, 0));

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
rm.forceResizeCheck();
await new Promise(r => setTimeout(r, 0));

assert.strictEqual(textEl.style.left, '150px');
assert.strictEqual(textEl.style.top, '150px');
assert.strictEqual(textEl.style.width, '300px');
assert.strictEqual(imgState.cx, 150);
assert.strictEqual(imgState.scale, 3);
assert.strictEqual(workEl.style.left, '20px');
assert.strictEqual(workEl.style.top, '10px');

console.log('ResponsiveManager scales elements and applies safe area offsets correctly');
