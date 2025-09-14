import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync('./main.js', 'utf8');

function extract(name) {
  let start = src.indexOf(`async function ${name}`);
  if (start === -1) start = src.indexOf(`function ${name}`);
  if (start === -1) throw new Error(`${name} not found`);
  let i = src.indexOf('{', start) + 1;
  let depth = 1;
  while (depth > 0 && i < src.length) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return src.slice(start, i);
}

const showSrc = extract('showPurchaseModal');
const unlockSrc = extract('unlockDesignFlow');

const context = {
  tokenBalance: 0,
  tokenBalanceEl: { textContent: '' },
  purchaseModal: { classList: { removed: [], added: [], remove(c){ this.removed.push(c); }, add(c){ this.added.push(c); } } },
  purchaseMessage: { textContent: '' },
  purchaseConfirm: { textContent: '', onclick: null },
  apiClient: { tokens: 0, async updateTokens(delta){ this.tokens += delta; } },
  locked: false,
  unlockCalls: 0
};
vm.createContext(context);
context.refreshTokenBalance = async function(){ context.tokenBalance = context.apiClient.tokens; context.tokenBalanceEl.textContent = `Tokens: ${context.tokenBalance}`; };
context.setLocked = function(val){ context.locked = val; };
vm.runInContext(unlockSrc + '\n' + showSrc, context);
context.unlockDesignFlow = function(){ context.unlockCalls++; };

// Spend flow deducts one token and unlocks editing
context.apiClient.tokens = 1;
context.tokenBalance = 1;
context.locked = true;
context.showPurchaseModal('spend');
assert.strictEqual(context.purchaseMessage.textContent, 'Spend 1 token to unlock this design?');
assert.strictEqual(context.purchaseConfirm.textContent, 'Unlock');
await context.purchaseConfirm.onclick();
assert.strictEqual(context.apiClient.tokens, 0);
assert.strictEqual(context.tokenBalance, 0);
assert.strictEqual(context.locked, false);
assert.deepStrictEqual(context.purchaseModal.classList.added, ['hidden']);
console.log('spend flow deducts token and unlocks design');

// Reset modal state
context.purchaseModal.classList.added = [];
context.purchaseModal.classList.removed = [];

// Buy flow purchases tokens and re-runs unlock flow
context.apiClient.tokens = 0;
context.tokenBalance = 0;
context.unlockCalls = 0;
context.showPurchaseModal('buy');
assert.strictEqual(context.purchaseMessage.textContent, 'You have no tokens. Purchase 5 tokens?');
assert.strictEqual(context.purchaseConfirm.textContent, 'Purchase');
await context.purchaseConfirm.onclick();
assert.strictEqual(context.apiClient.tokens, 5);
assert.strictEqual(context.tokenBalance, 5);
assert.strictEqual(context.unlockCalls, 1);
assert.deepStrictEqual(context.purchaseModal.classList.added, ['hidden']);
console.log('buy flow purchases tokens and triggers unlock');
