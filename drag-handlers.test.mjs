import assert from 'node:assert';
import { DragHandlersManager } from './drag-handlers.js';

class MockElement {
  constructor() {
    this.listeners = {};
    this.style = {};
  }
  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = new Set();
    this.listeners[type].add(handler);
  }
  removeEventListener(type, handler) {
    this.listeners[type]?.delete(handler);
  }
  listenerCount(type) {
    return this.listeners[type]?.size ?? 0;
  }
}

const elements = {
  work: new MockElement(),
  bgBox: new MockElement()
};

global.document = {
  getElementById(id) {
    return elements[id] || null;
  },
  body: { classList: { contains: () => false } },
  addEventListener() {},
  removeEventListener() {}
};

global.window = { addEventListener() {} };

const manager = new DragHandlersManager();
manager.initialize();

// Ensure listeners are added
assert.strictEqual(elements.work.listenerCount('pointerdown'), 1);
assert.strictEqual(elements.work.listenerCount('pointermove'), 1);
assert.strictEqual(elements.work.listenerCount('pointerup'), 1);
assert.strictEqual(elements.work.listenerCount('click'), 1);
assert.strictEqual(elements.work.listenerCount('touchstart'), 1);
assert.strictEqual(elements.work.listenerCount('touchmove'), 1);
assert.strictEqual(elements.work.listenerCount('touchend'), 1);
assert.strictEqual(elements.bgBox.listenerCount('pointerdown'), 1);
assert.strictEqual(elements.bgBox.listenerCount('pointermove'), 1);
assert.strictEqual(elements.bgBox.listenerCount('pointerup'), 1);

manager.cleanup();

// All listeners should be removed
assert.strictEqual(elements.work.listenerCount('pointerdown'), 0);
assert.strictEqual(elements.work.listenerCount('pointermove'), 0);
assert.strictEqual(elements.work.listenerCount('pointerup'), 0);
assert.strictEqual(elements.work.listenerCount('click'), 0);
assert.strictEqual(elements.work.listenerCount('touchstart'), 0);
assert.strictEqual(elements.work.listenerCount('touchmove'), 0);
assert.strictEqual(elements.work.listenerCount('touchend'), 0);
assert.strictEqual(elements.bgBox.listenerCount('pointerdown'), 0);
assert.strictEqual(elements.bgBox.listenerCount('pointermove'), 0);
assert.strictEqual(elements.bgBox.listenerCount('pointerup'), 0);

console.log('cleanup removes listeners successfully');

// Verify handlePointerUp handles transform handles
const manager2 = new DragHandlersManager();
let transformEnded = false;
manager2.handleTransformPointerUp = async () => { transformEnded = true; };
manager2.dragState = { type: 'handle' };
await manager2.handlePointerUp();
assert.strictEqual(transformEnded, true);
console.log('handlePointerUp handles transform handles successfully');

// ----- Transform handle scaling tests -----

// Stub out DOM for image-manager
function makeEl() {
  return {
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    setAttribute() {},
    remove() {},
    appendChild() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 200 }; },
    querySelectorAll() { return []; }
  };
}

const domElements = {};
global.document = {
  body: { classList: { contains: () => false } },
  querySelector(sel) {
    return domElements[sel] || (domElements[sel] = makeEl());
  },
  getElementById(id) {
    return domElements['#' + id] || (domElements['#' + id] = makeEl());
  }
};

global.window = { location: { hostname: 'localhost' }, fetch: async () => ({ ok: true, json: async () => ({}) }) };
global.fetch = global.window.fetch;

const { imgState } = await import('./image-manager.js');

imgState.has = true;
imgState.natW = 100;
imgState.natH = 100;
imgState.cx = 100;
imgState.cy = 100;
imgState.scale = 1;
imgState.signX = 1;
imgState.signY = 1;

const manager3 = new DragHandlersManager();

function setupDrag(handle) {
  const startX = handle.includes('w') ? 50 : 150;
  const startY = handle.includes('n') ? 50 : 150;
  manager3.dragState = {
    type: 'handle',
    handleType: handle,
    startX,
    startY,
    startScale: 1,
    startAngle: 0,
    centerX: 100,
    centerY: 100,
    startPointerAngle: 0,
    startVectorX: startX - 100,
    startVectorY: startY - 100,
    startDistance: Math.hypot(startX - 100, startY - 100)
  };
}

// Vertical drags from each handle should enlarge the image
for (const handle of ['nw', 'ne', 'se', 'sw']) {
  setupDrag(handle);
  imgState.scale = 1;
  const moveY = handle.includes('n') ? manager3.dragState.startY - 20 : manager3.dragState.startY + 20;
  await manager3.handleTransformPointerMove({ clientX: manager3.dragState.startX, clientY: moveY });
  assert.ok(imgState.scale > 1, `scale should increase for ${handle}`);
}

// Dragging across vertical center flips the Y sign
setupDrag('ne');
await manager3.handleTransformPointerMove({ clientX: 150, clientY: 160 });
assert.strictEqual(imgState.signY, -1);

console.log('transform handle scaling works for all handles and vertical drags');

