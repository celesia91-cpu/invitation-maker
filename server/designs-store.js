// server/designs-store.js
// Simple in-memory storage for user designs.
// In a real application this would interface with a database.

import { designs } from './database.js';

/**
 * Retrieve designs for the provided user id.
 * @param {string} userId
 * @param {{category?:string, search?:string}} [filters]
 * @returns {Promise<Array<{id:string,title:string,thumbnailUrl:string,updatedAt:string,category?:string,views?:number}>>}
 */
export async function getDesignsByUser(userId, filters = {}) {
  let results = Array.from(designs.values()).filter((d) => d.userId === userId);
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

/**
 * Retrieve a single design by id for the provided user id.
 * @param {string} userId
 * @param {string} id
 * @returns {Promise<{id:string,title:string,thumbnailUrl:string,updatedAt:string,category?:string,views?:number}|null>}
 */
export async function getDesignById(userId, id) {
  const design = designs.get(String(id));
  if (!design || design.userId !== userId) return null;
  return design;
}
