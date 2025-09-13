// server/designs-store.js
// Simple in-memory storage for user designs.
// In a real application this would interface with a database.

const designsByUser = {
  demo: [
    {
      id: '1',
      title: 'Sample Birthday Invite',
      category: 'Birthday',
      views: 150,
      thumbnailUrl: '/images/birthday-thumb.png',
      updatedAt: new Date('2024-01-01T12:00:00Z').toISOString()
    },
    {
      id: '2',
      title: 'Wedding Announcement',
      category: 'Wedding',
      views: 300,
      thumbnailUrl: '/images/wedding-thumb.png',
      updatedAt: new Date('2024-02-15T08:30:00Z').toISOString()
    }
  ]
};

/**
 * Retrieve designs for the provided user id.
 * @param {string} userId
 * @param {{category?:string, search?:string}} [filters]
 * @returns {Promise<Array<{id:string,title:string,thumbnailUrl:string,updatedAt:string,category?:string,views?:number}>>}
 */
export async function getDesignsByUser(userId, filters = {}) {
  let results = designsByUser[userId] ?? [];
  const { category, search } = filters;

  if (category && category !== 'popular' && category !== 'recent') {
    const cat = category.toLowerCase();
    results = results.filter((d) => (d.category || '').toLowerCase() === cat);
  }

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (d) => d.title.toLowerCase().includes(q) || (d.category && d.category.toLowerCase().includes(q))
    );
  }

  if (category === 'popular') {
    results = [...results].sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (category === 'recent') {
    results = [...results].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  return results;
}
