import assert from 'node:assert';

function createStubElement(id) {
  return {
    id,
    style: {},
    dataset: {},
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
    listeners: {},
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    appendChild(child) { this.children.push(child); },
    remove() {},
    addEventListener(type, handler) {
      if (!this.listeners[type]) this.listeners[type] = new Set();
      this.listeners[type].add(handler);
    },
    removeEventListener(type, handler) {
      this.listeners[type]?.delete(handler);
    },
    focus() { document.activeElement = this; },
    blur() { if (document.activeElement === this) document.activeElement = null; },
    dispatchEvent(evt) {
      (this.listeners[evt.type] || []).forEach(h => h.call(this, evt));
    },
    closest() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

const elements = { body: createStubElement('body'), work: createStubElement('work') };

global.document = {
  readyState: 'loading',
  body: elements.body,
  activeElement: null,
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
  removeEventListener() {},
  createRange() { return { selectNodeContents() {} }; }
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
  },
  getSelection() { return { removeAllRanges() {}, addRange() {} }; }
};

global.localStorage = window.localStorage;

const tm = await import('./text-manager.js');
const {
  addTextLayer,
  getActiveLayer,
  setActiveLayer,
  initializeTextManager,
  handleTextFadeIn,
  handleTextFadeOut,
  handleTextFadeInRange,
  handleTextFadeOutRange,
  handleTextZoomIn,
  handleTextZoomOut,
  handleTextZoomInRange,
  handleTextZoomOutRange,
  handleTextScale,
  handleTextRotate,
  handleFontFamily,
  handleFontSize,
  handleFontColor,
  handleBold,
  handleItalic,
  handleUnderline,
  syncToolbarFromActive
} = tm;

// Initial toolbar state
initializeTextManager();
const deleteBtn = document.getElementById('textDelete');
assert.ok(deleteBtn.disabled, 'delete button disabled initially');

await addTextLayer('Hello');
const layer = getActiveLayer();
assert.ok(!deleteBtn.disabled, 'delete button enabled after adding text');

// Single click selects but does not enter edit mode
setActiveLayer(null);
layer.dispatchEvent({ type: 'click', stopPropagation() {} });
assert.strictEqual(getActiveLayer(), layer);
assert.strictEqual(layer.contentEditable, 'false');
assert.strictEqual(layer.dataset.editing, 'false');
assert.strictEqual(layer.style.cursor, 'move');

// Double click enables editing
layer.dispatchEvent({ type: 'dblclick', stopPropagation() {} });
assert.strictEqual(layer.contentEditable, 'true');
assert.strictEqual(layer.dataset.editing, 'true');
assert.strictEqual(layer.style.cursor, 'text');
assert.strictEqual(document.activeElement, layer);

// Blur exits edit mode
layer.blur();
layer.dispatchEvent({ type: 'blur' });
assert.strictEqual(layer.contentEditable, 'false');
assert.strictEqual(layer.dataset.editing, 'false');
assert.strictEqual(layer.style.cursor, 'move');

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

// Scale and rotate handlers
handleTextScale(150);
assert.strictEqual(parseFloat(layer.dataset.scale), 1.5);
assert.ok(layer.style.transform.includes('scale(1.5'));
assert.strictEqual(document.getElementById('textScale').value, '150');
assert.strictEqual(document.getElementById('textScaleVal').textContent, '150%');

handleTextRotate(45);
assert.strictEqual(parseFloat(layer.dataset.rotate), 45);
assert.ok(layer.style.transform.includes('rotate(45deg)'));
assert.strictEqual(document.getElementById('textRotate').value, '45');
assert.strictEqual(document.getElementById('textRotateVal').textContent, '45°');

// Sync controls from existing transform
layer.dataset.scale = '2';
layer.dataset.rotate = '-30';
syncToolbarFromActive();
assert.strictEqual(document.getElementById('textScale').value, '200');
assert.strictEqual(document.getElementById('textScaleVal').textContent, '200%');
assert.strictEqual(document.getElementById('textRotate').value, '-30');
assert.strictEqual(document.getElementById('textRotateVal').textContent, '-30°');

// Style handlers
handleFontFamily('serif');
assert.strictEqual(layer.style.fontFamily, 'serif');

handleFontSize(30);
assert.strictEqual(layer.style.fontSize, '30px');
assert.strictEqual(document.getElementById('fontSizeVal').textContent, '30px');

handleFontColor('#ff0000');
assert.strictEqual(layer.style.color, '#ff0000');

handleBold();
assert.strictEqual(layer.style.fontWeight, 'bold');

handleItalic();
assert.strictEqual(layer.style.fontStyle, 'italic');

// Underline toggling and toolbar state
const underlineBtn = document.getElementById('underlineBtn');
syncToolbarFromActive();
assert.strictEqual(layer.style.textDecoration, 'none');
assert.ok(!underlineBtn.classList.contains('active'));

handleUnderline();
assert.strictEqual(layer.style.textDecoration, 'underline');
assert.ok(underlineBtn.classList.contains('active'));

handleUnderline();
assert.strictEqual(layer.style.textDecoration, 'none');
assert.ok(!underlineBtn.classList.contains('active'));

// Direct sync from style
layer.style.textDecoration = 'underline';
syncToolbarFromActive();
assert.ok(underlineBtn.classList.contains('active'));
layer.style.textDecoration = 'none';
syncToolbarFromActive();
assert.ok(!underlineBtn.classList.contains('active'));

// Delete button state after deselect
setActiveLayer(null);
assert.ok(deleteBtn.disabled, 'delete button disabled after deselecting layer');

console.log('Delete button toggles with text layer selection');
console.log('Text style handlers apply formatting without errors');
