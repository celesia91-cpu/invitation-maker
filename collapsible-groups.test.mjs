import assert from 'node:assert';

// ----- DOM and storage stubs -----
function createClassList() {
  return {
    classes: new Set(),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    contains(c) { return this.classes.has(c); },
    toggle(c, force) {
      if (force === undefined) {
        if (this.classes.has(c)) { this.classes.delete(c); return false; }
        this.classes.add(c); return true;
      }
      if (force) { this.classes.add(c); return true; }
      this.classes.delete(c); return false;
    }
  };
}

function createGroup() {
  const group = {
    classList: createClassList(),
    dataset: {},
    querySelector(sel) {
      if (sel === '.group-title') return this.title;
      return null;
    },
    querySelectorAll() { return []; }
  };

  const title = {
    attributes: {},
    handlers: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k]; },
    addEventListener(type, fn) { this.handlers[type] = fn; },
    closest(sel) { return sel === '.group' ? group : null; }
  };

  group.title = title;
  return { group, title };
}

const groupA = createGroup();
const groupB = createGroup();
const groups = [groupA, groupB];

const storage = {};
global.localStorage = {
  getItem(k) { return storage[k] ?? null; },
  setItem(k, v) { storage[k] = String(v); },
  removeItem(k) { delete storage[k]; },
  clear() { Object.keys(storage).forEach(k => delete storage[k]); }
};

global.document = {
  querySelectorAll(selector) {
    if (selector === '.group-title') return groups.map(g => g.title);
    if (selector === '.group') return groups.map(g => g.group);
    return [];
  }
};

// Preload state: collapse first group
localStorage.setItem('groupState-0', 'collapsed');

const mod = await import('./collapsible-groups.js');
const { initializeCollapsibleGroups, collapseAllGroups, expandAllGroups, toggleAllGroups } = mod;

// ----- Tests -----
initializeCollapsibleGroups();
assert.ok(groupA.group.classList.contains('collapsed'));
assert.strictEqual(groupA.title.getAttribute('aria-expanded'), 'false');
assert.ok(!groupB.group.classList.contains('collapsed'));
assert.strictEqual(groupB.title.getAttribute('aria-expanded'), 'true');
assert.strictEqual(groupA.title.getAttribute('role'), 'button');
assert.strictEqual(groupA.title.getAttribute('tabindex'), '0');
const keyHandler = groupA.title.handlers.keydown;
keyHandler({ key: 'Enter', preventDefault() {} });
assert.ok(!groupA.group.classList.contains('collapsed'));
assert.strictEqual(groupA.title.getAttribute('aria-expanded'), 'true');
keyHandler({ key: ' ', preventDefault() {} });
assert.ok(groupA.group.classList.contains('collapsed'));
assert.strictEqual(groupA.title.getAttribute('aria-expanded'), 'false');
console.log('keyboard toggle works');
console.log('restore state works');

// Click handler toggles state and persists
const clickHandler = groupB.title.handlers.click;
clickHandler({});
assert.ok(groupB.group.classList.contains('collapsed'));
assert.strictEqual(localStorage.getItem('groupState-1'), 'collapsed');
console.log('click toggles group and saves');

// Expand all
expandAllGroups();
assert.ok(!groupA.group.classList.contains('collapsed'));
assert.ok(!groupB.group.classList.contains('collapsed'));
console.log('expandAllGroups expands all');

// Collapse all
collapseAllGroups();
assert.ok(groupA.group.classList.contains('collapsed'));
assert.ok(groupB.group.classList.contains('collapsed'));
console.log('collapseAllGroups collapses all');

// Toggle all (should expand both)
toggleAllGroups();
assert.ok(!groupA.group.classList.contains('collapsed'));
assert.ok(!groupB.group.classList.contains('collapsed'));
console.log('toggleAllGroups toggles each group');
