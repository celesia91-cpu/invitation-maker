import assert from 'node:assert';

// --- Minimal DOM stubs ---
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
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    textContent: '',
    innerHTML: '',
    disabled: false,
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect() { return { width: 0, height: 0 }; }
  };
}

const elements = { body: createStubElement('body') };

global.document = {
  readyState: 'loading',
  body: elements.body,
  documentElement: { style: { setProperty() {} } },
  getElementById(id) {
    if (!elements[id]) elements[id] = createStubElement(id);
    return elements[id];
  },
  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return createStubElement(sel);
  },
  createElement(tag) { return createStubElement(tag); },
  addEventListener() {},
  removeEventListener() {}
};

global.window = {
  addEventListener() {},
  removeEventListener() {},
  matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
  open() {},
  location: { hostname: 'example.com' }
};

const ui = await import('./ui-manager.js');
const { setMobileTopbarCollapsed, togglePanel, enterPreview, exitPreview } = ui;

const body = document.body;
const topbarToggle = document.getElementById('topbarToggle');
const togglePanelBtn = document.getElementById('togglePanelBtn');
const previewBtn = document.getElementById('previewBtn');

// --- setMobileTopbarCollapsed ---
setMobileTopbarCollapsed(true);
assert.ok(body.classList.contains('mb-topbar-collapsed'));
assert.strictEqual(topbarToggle.getAttribute('aria-expanded'), 'false');
assert.strictEqual(topbarToggle.textContent, '▾');

setMobileTopbarCollapsed(false);
assert.ok(!body.classList.contains('mb-topbar-collapsed'));
assert.strictEqual(topbarToggle.getAttribute('aria-expanded'), 'true');
assert.strictEqual(topbarToggle.textContent, '▴');
console.log('setMobileTopbarCollapsed updates DOM state');

// --- togglePanel ---
togglePanel(); // opens panel
assert.ok(body.classList.contains('panel-open'));
assert.strictEqual(togglePanelBtn.getAttribute('aria-expanded'), 'true');
assert.strictEqual(previewBtn.getAttribute('aria-pressed'), 'false');
assert.ok(togglePanelBtn.classList.contains('active'));

togglePanel(); // closes panel
assert.ok(!body.classList.contains('panel-open'));
assert.strictEqual(togglePanelBtn.getAttribute('aria-expanded'), 'false');
assert.ok(!togglePanelBtn.classList.contains('active'));
console.log('togglePanel opens and closes the editor panel');

// --- enterPreview / exitPreview ---
enterPreview();
assert.ok(body.classList.contains('preview'));
assert.strictEqual(previewBtn.getAttribute('aria-pressed'), 'true');

exitPreview();
assert.ok(!body.classList.contains('preview'));
assert.strictEqual(previewBtn.getAttribute('aria-pressed'), 'false');
console.log('enterPreview and exitPreview toggle preview mode and aria-pressed');
