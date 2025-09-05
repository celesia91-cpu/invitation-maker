import assert from 'node:assert';
import { stateManager } from './state-manager.js';

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
