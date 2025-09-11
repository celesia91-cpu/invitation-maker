import assert from 'node:assert';

// Minimal DOM stubs
function makeEl() {
  return {
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {},
    setAttribute() {},
    remove() {},
    getBoundingClientRect() { return { width: workWidth, height: workHeight }; },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
  };
}

let workWidth = 1000;
let workHeight = 1000;
const workEl = {
  getBoundingClientRect() { return { width: workWidth, height: workHeight }; }
};

const elements = {
  '#work': workEl,
  '#userBgWrap': makeEl(),
  '#bgBox': makeEl()
};

global.document = {
  querySelector(sel) { return elements[sel] || makeEl(); },
  getElementById() { return makeEl(); },
  body: { classList: { contains() { return false; }, add() {}, remove() {}, toggle() {} } }
};

global.window = { addEventListener() {}, removeEventListener() {}, location: { hostname: 'localhost' } };
global.sessionStorage = { getItem() {}, setItem() {}, removeItem() {} };

const { setImagePositionFromPercentage, imgState } = await import('./image-manager.js');

// Test contain mode scaling
workWidth = 2000;
workHeight = 2000;
imgState.has = true;
setImagePositionFromPercentage({
  cxPercent: 50,
  cyPercent: 50,
  scale: 1,
  originalWidth: 1000,
  originalHeight: 500
}, false, 'contain');
assert.strictEqual(imgState.scale, 2);

// Test cover mode scaling
setImagePositionFromPercentage({
  cxPercent: 50,
  cyPercent: 50,
  scale: 1,
  originalWidth: 1000,
  originalHeight: 500
}, false, 'cover');
assert.strictEqual(imgState.scale, 4);

console.log('setImagePositionFromPercentage scales correctly for contain and cover');
