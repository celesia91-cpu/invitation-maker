import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

// Extract openPreview and closePreview from main.js
const src = fs.readFileSync('./main.js', 'utf8');
const openMatch = src.match(/function openPreview\(design\) {[\s\S]*?}\n/);
const closeMatch = src.match(/function closePreview\(\) {[\s\S]*?}\n/);
if (!openMatch || !closeMatch) throw new Error('preview functions not found');

const context = {
  currentPreviewDesign: null,
  previewModal: { classList: { removed: [], added: [], remove(c){ this.removed.push(c); }, add(c){ this.added.push(c); } } },
  previewSlides: { innerHTML: '', children: [], appendChild(el){ this.children.push(el); } },
  document: {
    createElement(tag){ return { tagName: tag, src: '', alt: '', loading: '', appendChild(){}, }; }
  }
};
vm.createContext(context);
vm.runInContext(openMatch[0] + closeMatch[0], context);

// Open preview with multiple slides
const design = { title: 'Test', slides: ['a.png', 'b.png'] };
context.openPreview(design);
assert.strictEqual(context.currentPreviewDesign, design);
assert.strictEqual(context.previewSlides.children.length, 2);
assert.deepStrictEqual(context.previewModal.classList.removed, ['hidden']);
console.log('openPreview populates slides and shows modal');

// Close preview
context.closePreview();
assert.strictEqual(context.currentPreviewDesign, null);
assert.deepStrictEqual(context.previewModal.classList.added, ['hidden']);
console.log('closePreview hides modal and clears current design');
