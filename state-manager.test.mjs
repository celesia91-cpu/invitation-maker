import assert from 'node:assert';
import { setState, getState } from './state-manager.js';

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
