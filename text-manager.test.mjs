import assert from 'node:assert';

function createStubElement(id) {
  return {
    id,
    style: {},
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this.classes.has(c)) { this.classes.delete(c); return false; }
          this.classes.add(c); return true;
        }
        if (force) { this.classes.add(c); return true; }
        this.classes.delete(c); return false;
      }
    },
    value: '',
    textContent: '',
    disabled: false,
    attributes: {},
    children: [],
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    appendChild(child) { this.children.push(child); },
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    closest() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

const elements = { body: createStubElement('body'), work: createStubElement('work') };

global.document = {
  readyState: 'loading',
  body: elements.body,
  getElementById(id) {
    if (!elements[id]) elements[id] = createStubElement(id);
    return elements[id];
  },
  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return null;
  },
  querySelectorAll() { return []; },
  createElement(tag) { return createStubElement(tag); },
  addEventListener() {},
  removeEventListener() {}
};

global.window = {
  addEventListener() {},
  removeEventListener() {},
  matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
  open() {},
  location: { hostname: 'example.com' },
  localStorage: {
    store: {},
    setItem(k, v) { this.store[k] = v; },
    getItem(k) { return this.store[k]; },
    removeItem(k) { delete this.store[k]; }
  }
};

global.localStorage = window.localStorage;

const tm = await import('./text-manager.js');
const {
  addTextLayer,
  getActiveLayer,
  handleTextFadeIn,
  handleTextFadeOut,
  handleTextFadeInRange,
  handleTextFadeOutRange,
  handleTextZoomIn,
  handleTextZoomOut,
  handleTextZoomInRange,
  handleTextZoomOutRange
} = tm;

await addTextLayer('Hello');
const layer = getActiveLayer();

// Ensure initial UI state
const fadeInBtn = document.getElementById('textFadeInBtn');
const fadeInRange = document.getElementById('textFadeInRange');
const fadeInVal = document.getElementById('textFadeInVal');
assert.ok(!fadeInBtn.classList.contains('active'));
assert.strictEqual(Number(fadeInRange.value), 0);
assert.strictEqual(fadeInVal.textContent, '0.0s');

handleTextFadeIn();
assert.strictEqual(layer._fadeInMs, 800);
assert.ok(fadeInBtn.classList.contains('active'));
assert.strictEqual(Number(fadeInRange.value), 800);
assert.strictEqual(fadeInVal.textContent, '0.8s');

handleTextFadeInRange(1200);
assert.strictEqual(layer._fadeInMs, 1200);
assert.strictEqual(fadeInVal.textContent, '1.2s');

handleTextFadeOut();
const fadeOutBtn = document.getElementById('textFadeOutBtn');
const fadeOutRange = document.getElementById('textFadeOutRange');
const fadeOutVal = document.getElementById('textFadeOutVal');
assert.strictEqual(layer._fadeOutMs, 800);
assert.ok(fadeOutBtn.classList.contains('active'));
assert.strictEqual(Number(fadeOutRange.value), 800);
assert.strictEqual(fadeOutVal.textContent, '0.8s');

handleTextFadeOutRange(500);
assert.strictEqual(layer._fadeOutMs, 500);
assert.strictEqual(fadeOutVal.textContent, '0.5s');

handleTextZoomIn();
const zoomInBtn = document.getElementById('textZoomInBtn');
const zoomInRange = document.getElementById('textZoomInRange');
const zoomInVal = document.getElementById('textZoomInVal');
assert.strictEqual(layer._zoomInMs, 800);
assert.ok(zoomInBtn.classList.contains('active'));
assert.strictEqual(Number(zoomInRange.value), 800);
assert.strictEqual(zoomInVal.textContent, '0.8s');

handleTextZoomInRange(1000);
assert.strictEqual(layer._zoomInMs, 1000);
assert.strictEqual(zoomInVal.textContent, '1.0s');

handleTextZoomOut();
const zoomOutBtn = document.getElementById('textZoomOutBtn');
const zoomOutRange = document.getElementById('textZoomOutRange');
const zoomOutVal = document.getElementById('textZoomOutVal');
assert.strictEqual(layer._zoomOutMs, 800);
assert.ok(zoomOutBtn.classList.contains('active'));
assert.strictEqual(Number(zoomOutRange.value), 800);
assert.strictEqual(zoomOutVal.textContent, '0.8s');

handleTextZoomOutRange(600);
assert.strictEqual(layer._zoomOutMs, 600);
assert.strictEqual(zoomOutVal.textContent, '0.6s');

console.log('Text fade and zoom handlers update layer properties and UI');
