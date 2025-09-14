import assert from 'node:assert';
import { getDesignsByUser } from './designs-store.js';
import { designs } from './database.js';

// Prepare sample designs for testing
const userId = 'u1';
designs.set('a', {
  id: 'a',
  userId,
  title: 'Birthday Bash',
  category: 'birthday',
  views: 10,
  thumbnailUrl: 'a.png',
  updatedAt: new Date('2024-01-01T00:00:00Z').toISOString()
});
designs.set('b', {
  id: 'b',
  userId,
  title: 'Wedding Bells',
  category: 'wedding',
  views: 50,
  thumbnailUrl: 'b.png',
  updatedAt: new Date('2024-03-01T00:00:00Z').toISOString()
});
designs.set('c', {
  id: 'c',
  userId,
  title: 'Recent Party',
  category: 'birthday',
  views: 5,
  thumbnailUrl: 'c.png',
  updatedAt: new Date('2024-04-01T00:00:00Z').toISOString()
});

// Category filtering
{
  const res = await getDesignsByUser(userId, { category: 'wedding' });
  assert.deepStrictEqual(res.map(d => d.id), ['b']);
  console.log('filters designs by category');
}

// Search filtering
{
  const res = await getDesignsByUser(userId, { search: 'party' });
  assert.deepStrictEqual(res.map(d => d.id), ['c']);
  console.log('filters designs by search term');
}

// Popular sorting
{
  const res = await getDesignsByUser(userId, { category: 'popular' });
  assert.deepStrictEqual(res.map(d => d.id), ['b', 'a', 'c']);
  console.log('sorts designs by popularity');
}

// Recent sorting
{
  const res = await getDesignsByUser(userId, { category: 'recent' });
  assert.deepStrictEqual(res.map(d => d.id), ['c', 'b', 'a']);
  console.log('sorts designs by recency');
}
