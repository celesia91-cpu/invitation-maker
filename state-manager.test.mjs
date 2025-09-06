import assert from 'node:assert';

import stateManager, { setState, getState } from './state-manager.js';

// Minimal mock HTMLElement with a circular reference to simulate DOM structure
class MockHTMLElement {
  constructor() {
    this.self = this; // circular reference
    this.nodeType = 1;
  }
}

const element = new MockHTMLElement();

// Ensure setting activeLayer with a DOM-like node does not cause recursion errors
assert.doesNotThrow(() => {
  setState({ activeLayer: element });
});

assert.strictEqual(getState('activeLayer'), element);
console.log('setting activeLayer with HTMLElement avoids stack overflow');


// Ensure clean state before testing
stateManager.reset();

// Setting activeLayer should replace the previous object entirely
stateManager.activeLayer = { id: 1, name: 'first' };
stateManager.activeLayer = { id: 2 };
assert.deepStrictEqual(stateManager.activeLayer, { id: 2 });
console.log('activeLayer setter replaces existing object');

// Other state paths should still merge correctly by default
stateManager.setState({ defaults: { fontColor: '#000000' } });
assert.strictEqual(stateManager.state.defaults.fontFamily, 'system-ui');
assert.strictEqual(stateManager.state.defaults.fontSize, 28);
assert.strictEqual(stateManager.state.defaults.fontColor, '#000000');
console.log('setState merges nested objects without affecting other keys');

// Create a fresh instance to avoid state pollution
const sm = new stateManager.constructor();

// --- Array merging ---
{
  const target = { arr: [1, 2] };
  const source = { arr: [3, 4] };
  const result = sm.deepMerge(target, source);

  assert.deepStrictEqual(result.arr, [3, 4]);
  assert.notStrictEqual(result.arr, source.arr, 'arrays should be shallow-copied');
  console.log('deepMerge replaces arrays with shallow copies');
}

// --- Non-plain objects ---
{
  class Custom {
    constructor(x) { this.x = x; }
  }
  const target = { obj: new Custom(1) };
  const source = { obj: new Custom(2) };
  const result = sm.deepMerge(target, source);

  assert.strictEqual(result.obj, source.obj);
  assert.notStrictEqual(result.obj, target.obj);
  console.log('deepMerge bypasses recursion for class instances');
}


