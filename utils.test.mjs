import assert from 'node:assert';
import { encodeState, decodeState } from './utils.js';

// A minimal project state containing non-ASCII characters to verify
// Unicode-safe base64 round-tripping.
const project = {
  v: 1,
  slides: [
    {
      layers: [
        { text: 'こんにちは世界🌍' }
      ],
      workSize: { w: 100, h: 100 },
      durationMs: 1000
    }
  ],
  activeIndex: 0,
  defaults: {}
};

const encoded = encodeState(project);
const decoded = decodeState(encoded);

assert.strictEqual(decoded.slides[0].layers[0].text, 'こんにちは世界🌍');
console.log('encodeState/decodeState round-trip non-ASCII text successfully');

// Invalid data should throw a clear error
assert.throws(() => decodeState('not_base64!'), /Invalid or corrupted/);
console.log('decodeState rejects malformed input');
