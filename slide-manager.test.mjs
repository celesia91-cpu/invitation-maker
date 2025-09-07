import assert from 'node:assert';

function createStubElement(id) {
  return {
    id,
    style: { setProperty() {} },
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
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild() {},
    remove() {},
    getBoundingClientRect() { return { width: 800, height: 450, left: 0, top: 0 }; },
    addEventListener() {},
    removeEventListener() {}
  };
}

const elements = { body: createStubElement('body') };

global.document = {
  body: elements.body,
  getElementById(id) {
    if (!elements[id]) elements[id] = createStubElement(id);
    return elements[id];
  },
  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return createStubElement(sel);
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
  location: { hostname: 'example.com' }
};

global.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = id => clearTimeout(id);

global.performance = { now: () => Date.now() };

const sm = await import('./state-manager.js');
sm.setSlides([{ layers: [], durationMs: 1000 }]);
sm.setActiveIndex(0);

const { playSlides, stopSlides } = await import('./slide-manager.js');

const playBtn = document.getElementById('playSlidesBtn');

playSlides();
assert.strictEqual(playBtn.getAttribute('aria-pressed'), 'true');

stopSlides();
assert.strictEqual(playBtn.getAttribute('aria-pressed'), 'false');

console.log('playSlides and stopSlides toggle aria-pressed');
