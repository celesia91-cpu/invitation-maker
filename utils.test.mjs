import assert from 'node:assert';
import { encodeState, decodeState, workSize } from './utils.js';

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

// Zoom timing fields should persist through serialization
const projectZoom = {
  v: 1,
  slides: [
    {
      image: {
        src: 'http://example.com/a.jpg',
        thumb: null,
        cx: 0,
        cy: 0,
        scale: 1,
        angle: 0,
        flip: false,
        fadeInMs: 100,
        fadeOutMs: 200,
        zoomInMs: 300,
        zoomOutMs: 400
      },
      layers: [
        {
          text: 'zoom test',
          left: 0,
          top: 0,
          fontSize: 20,
          fontFamily: 'Arial',
          color: '#000',
          fontWeight: '400',
          fontStyle: 'normal',
          textDecoration: 'none',
          padding: '4px 6px',
          fadeInMs: 10,
          fadeOutMs: 20,
          zoomInMs: 30,
          zoomOutMs: 40
        }
      ],
      workSize: { w: 100, h: 100 },
      durationMs: 1000
    }
  ],
  activeIndex: 0,
  defaults: {}
};

const encodedZoom = encodeState(projectZoom);
const decodedZoom = decodeState(encodedZoom);
assert.strictEqual(decodedZoom.slides[0].image.zoomInMs, 300);
assert.strictEqual(decodedZoom.slides[0].layers[0].zoomOutMs, 40);
console.log('zoom timing fields persist through encode/decode');

// Invalid data should throw a clear error
assert.throws(() => decodeState('not_base64!'), /Invalid or corrupted/);
console.log('decodeState rejects malformed input');

// workSize should return fallback when #work element is missing
global.document = { querySelector: () => null };
assert.deepStrictEqual(workSize(), { w: 0, h: 0 });
console.log('workSize returns fallback when #work is absent');
