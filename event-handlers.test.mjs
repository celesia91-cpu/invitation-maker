import assert from 'node:assert';

// --- Minimal DOM stubs with event handling ---
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
    listeners: {},
    attributes: {},
    children: [],
    parent: null,
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    appendChild(child) { child.parent = this; this.children.push(child); },
    remove() {
      if (this.parent) {
        const idx = this.parent.children.indexOf(this);
        if (idx >= 0) this.parent.children.splice(idx, 1);
        this.parent = null;
      }
    },
    addEventListener(type, handler) {
      (this.listeners[type] ||= []).push(handler);
    },
    removeEventListener(type, handler) {
      const arr = this.listeners[type];
      if (!arr) return;
      const idx = arr.indexOf(handler);
      if (idx >= 0) arr.splice(idx, 1);
    },
    focus() {},
    closest() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    textContent: '',
    contentEditable: false,
    value: '',
    disabled: false
  };
}

const elements = {
  body: createStubElement('body'),
  work: createStubElement('work'),
  textDelete: createStubElement('textDelete'),
  addTextBtn: createStubElement('addTextBtn'),
  addText: createStubElement('addText')
};

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
  querySelectorAll(sel) {
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      return Object.values(elements).filter(el => el.classList.contains(cls));
    }
    return [];
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
  location: { hostname: 'example.com' },
  localStorage: {
    store: {},
    setItem(k, v) { this.store[k] = v; },
    getItem(k) { return this.store[k]; },
    removeItem(k) { delete this.store[k]; }
  }
};

global.localStorage = window.localStorage;

const { EventHandlersManager } = await import('./event-handlers.js');
const tm = await import('./text-manager.js');
const stateManager = (await import('./state-manager.js')).default;

// Spy on history updates and disable saves
let historyCount = 0;
stateManager.pushHistoryDebounced = () => { historyCount++; };
stateManager.save = () => {};

// Create an active text layer
const layer = createStubElement('layer1');
layer.classList.add('layer');

elements.work.appendChild(layer);
const { setActiveLayer, getActiveLayer } = tm;
setActiveLayer(layer);

// Setup handler for #textDelete
const manager = new EventHandlersManager();
manager.setupTextManagementHandlers();

// Trigger click on delete button
const deleteBtn = elements.textDelete;
await deleteBtn.listeners.click[0]({ target: deleteBtn });

// Assertions
assert.strictEqual(elements.work.children.length, 0, 'layer removed from work');
assert.strictEqual(getActiveLayer(), null, 'active layer cleared');
assert.strictEqual(historyCount, 1, 'history updated');

console.log('#textDelete removes active text layer and updates history');
