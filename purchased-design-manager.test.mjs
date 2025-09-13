import assert from 'node:assert';
import { PurchasedDesignManager } from './purchased-design-manager.js';

// Stub document with minimal DOM escaping capability
function createElement(tag) {
  return {
    tagName: tag.toUpperCase(),
    innerHTML: '',
    children: [],
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    set textContent(value) {
      this.innerHTML = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };
}

global.document = {
  body: {
    innerHTML: '',
    children: [],
    appendChild(el) { this.children.push(el); }
  },
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

// Directly verify escapeHtml behavior
assert.strictEqual(
  manager.escapeHtml('<b>bold & "quotes"</b>'),
  '&lt;b&gt;bold &amp; &quot;quotes&quot;&lt;/b&gt;'
);
console.log('escapeHtml safely encodes special characters');

// verifyAccess blocks editing when locked
{
  document.body.children = [];
  const m = new PurchasedDesignManager('t');
  m.customer = { locked: true };
  m.verifyAccess();
  assert.ok(m.editingLocked);
  console.log('verifyAccess blocks editing for locked designs');
}

// Owned designs expose download and edit buttons and track usage limits
{
  document.body.children = [];
  const m = new PurchasedDesignManager('t');
  m.customer = {
    owned: true,
    usageLimit: 2,
    usageCount: 0,
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  };
  m.verifyAccess();
  assert.ok(document.body.children.some((c) => c.id === 'ownershipActions'));
  assert.ok(!m.editingLocked);
  m.recordUsage();
  m.recordUsage();
  assert.ok(m.editingLocked);
  console.log('owned designs expose actions and respect usage limits');
}
