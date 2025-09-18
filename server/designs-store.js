// server/designs-store.js
// Simple in-memory storage for user designs.
// In a real application this would interface with a database.

import { designs, designOwners } from './database.js';

function withDesignOwnership(design) {
  if (!design) return null;
  const ownership = designOwners.get(String(design.id));
  if (!ownership) {
    return { ...design };
  }
  return {
    ...design,
    userId: ownership.userId
  };
}

/**
 * Retrieve designs for the provided user id.
 * @param {string} userId
 * @param {{category?:string, search?:string}} [filters]
 * @returns {Promise<Array<{id:string,title:string,thumbnailUrl:string,updatedAt:string,category?:string,views?:number}>>}
 */
export async function getDesignsByUser(userId, filters = {}) {
  const normalizedUserId = String(userId);
  const ownedDesignIds = new Set(
    Array.from(designOwners.entries())
      .filter(([, ownership]) => ownership.userId === normalizedUserId)
      .map(([designId]) => String(designId))
  );

  let results = Array.from(designs.values()).filter((design) =>
    ownedDesignIds.has(String(design.id))
  );
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

  return results.map((design) => withDesignOwnership(design));
}

/**
 * Retrieve a single design by id for the provided user id.
 * @param {string} userId
 * @param {string} id
 * @returns {Promise<{id:string,title:string,thumbnailUrl:string,updatedAt:string,category?:string,views?:number}|null>}
 */
export async function getDesignById(userId, id) {
  const key = String(id);
  const design = designs.get(key);
  if (!design) return null;
  const ownership = designOwners.get(key);
  if (!ownership || ownership.userId !== String(userId)) return null;
  return withDesignOwnership(design);
}

/**
 * Retrieve all designs flagged as admin templates.
 * Optionally filter by the admin user managing the template.
 * @param {{ managedBy?: string }} [filters]
 * @returns {Promise<Array<object>>}
 */
export async function getAdminDesigns(filters = {}) {
  const { managedBy } = filters;
  let results = Array.from(designs.values()).filter((design) => design.isAdminTemplate);

  if (managedBy) {
    const managerId = String(managedBy);
    results = results.filter((design) => design.managedByAdminId === managerId);
  }

  return results.map((design) => withDesignOwnership(design));
}

export { withDesignOwnership };
