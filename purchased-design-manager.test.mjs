import assert from 'node:assert';
import { PurchasedDesignManager } from './purchased-design-manager.js';

// Stub document with minimal DOM escaping capability
function createElement(tag) {
  return {
    innerHTML: '',
    set textContent(value) {
      this.innerHTML = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };
}

global.document = {
  body: { innerHTML: '' },
  createElement
};

global.window = {};

const manager = new PurchasedDesignManager('token');
const malicious = '<img src=x onerror="globalThis.hacked=true">';
manager.showAccessError(malicious);

// The body should contain escaped HTML, not actual <img> tags
assert.ok(document.body.innerHTML.includes('&lt;img src=x onerror='));
assert.ok(!document.body.innerHTML.includes('<img'));
assert.strictEqual(globalThis.hacked, undefined);

console.log('showAccessError escapes message HTML');
