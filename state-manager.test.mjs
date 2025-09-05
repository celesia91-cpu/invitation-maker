import assert from 'node:assert';
import { stateManager } from './state-manager.js';

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
