import assert from 'node:assert';
import { DragHandlersManager } from './drag-handlers.js';

class MockElement {
  constructor() {
    this.listeners = {};
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
  body: { classList: { contains: () => false } }
};

global.window = {};

const manager = new DragHandlersManager();
manager.initialize();

// Ensure listeners are added
assert.strictEqual(elements.work.listenerCount('pointerdown'), 1);
assert.strictEqual(elements.work.listenerCount('pointermove'), 1);
assert.strictEqual(elements.work.listenerCount('pointerup'), 1);
assert.strictEqual(elements.work.listenerCount('click'), 1);
assert.strictEqual(elements.bgBox.listenerCount('pointerdown'), 1);
assert.strictEqual(elements.bgBox.listenerCount('pointermove'), 1);
assert.strictEqual(elements.bgBox.listenerCount('pointerup'), 1);

manager.cleanup();

// All listeners should be removed
assert.strictEqual(elements.work.listenerCount('pointerdown'), 0);
assert.strictEqual(elements.work.listenerCount('pointermove'), 0);
assert.strictEqual(elements.work.listenerCount('pointerup'), 0);
assert.strictEqual(elements.work.listenerCount('click'), 0);
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

