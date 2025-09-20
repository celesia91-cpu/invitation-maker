import test from 'node:test';
import assert from 'node:assert/strict';

import { getMarketplaceDesigns } from '../designs-store.js';
import { recordView, recordConversion } from '../analytics-store.js';

test('consumer role receives consumer-visible marketplace listings', async () => {
  const result = await getMarketplaceDesigns({ role: 'consumer' });
  assert.equal(result.role, 'consumer');
  const ids = result.data.map((d) => d.id);
  assert.ok(ids.includes('1'));
  assert.ok(!ids.includes('2'));
  assert.ok(ids.includes('3'));

  const premiumListing = result.data.find((entry) => entry.id === '3');
  assert.ok(premiumListing);
  assert.equal(premiumListing.priceCents, 2499);
  assert.equal(premiumListing.designer.displayName, 'Studio Omega');
});

test('creator role exposes creator-visible designs with creator flags', async () => {
  const result = await getMarketplaceDesigns({ role: 'creator' });
  assert.equal(result.role, 'creator');
  const ids = result.data.map((d) => d.id);
  assert.ok(ids.includes('1'));
  assert.ok(ids.includes('2'));
  assert.ok(!ids.includes('3'));

  const creatorListing = result.data.find((entry) => entry.id === '2');
  assert.ok(creatorListing?.flags);
  assert.ok(Object.prototype.hasOwnProperty.call(creatorListing.flags, 'isAdminTemplate'));
});

test('admin role includes visibility info and conversion rates', async () => {
  recordView('1');
  recordView('1');
  recordConversion('1');

  const result = await getMarketplaceDesigns({ role: 'admin' });
  assert.equal(result.role, 'admin');
  const entry = result.data.find((item) => item.id === '1');
  assert.ok(entry);
  assert.ok(entry.visibility);
  assert.equal(entry.visibility.consumer, true);
  assert.equal(entry.conversionRate, 0.5);
  assert.equal(entry.status, 'published');
});

test('requesting an unsupported role rejects', async () => {
  await assert.rejects(() => getMarketplaceDesigns({ role: 'guest' }));
});

test('ownership filters restrict marketplace listings to matching designers', async () => {
  const ownerResult = await getMarketplaceDesigns({ role: 'admin', ownerId: 'demo' });
  assert.equal(ownerResult.role, 'admin');
  assert.deepEqual(
    ownerResult.data.map((entry) => entry.id),
    ['1', '2']
  );

  const mineResult = await getMarketplaceDesigns({
    role: 'admin',
    mine: true,
    requestingUserId: 'studio-omega',
  });
  assert.equal(mineResult.role, 'admin');
  assert.deepEqual(
    mineResult.data.map((entry) => entry.id),
    ['3']
  );
});
