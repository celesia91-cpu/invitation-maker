// server/designs-store.js
// Simple in-memory storage for user designs.
// In a real application this would interface with a database.

import { designs, designOwners } from './database.js';
import { getConversionRates } from './analytics-store.js';

const MARKETPLACE_ROLES = new Set(['creator', 'consumer', 'admin']);

function toDisplayName(userId) {
  const value = String(userId || '').trim();
  if (!value) return 'Unknown Designer';
  if (value.toLowerCase() === 'demo') return 'Demo Creator';
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getVisibility(design) {
  const defaults = { creator: false, consumer: false, admin: true };
  const raw = design && typeof design.visibility === 'object' ? design.visibility : null;
  if (!raw) {
    return { ...defaults };
  }
  return {
    creator: Boolean(Object.prototype.hasOwnProperty.call(raw, 'creator') ? raw.creator : defaults.creator),
    consumer: Boolean(Object.prototype.hasOwnProperty.call(raw, 'consumer') ? raw.consumer : defaults.consumer),
    admin: Boolean(Object.prototype.hasOwnProperty.call(raw, 'admin') ? raw.admin : defaults.admin)
  };
}

function isVisibleForRole(design, role) {
  if (role === 'admin') return true;
  const visibility = getVisibility(design);
  return Boolean(visibility[role]);
}

function resolveBadges(design) {
  if (!design || !Array.isArray(design.badges)) return [];
  const seen = new Set();
  const badges = [];
  for (const badge of design.badges) {
    const label = String(badge || '').trim();
    if (!label) continue;
    if (seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    badges.push(label);
  }
  return badges;
}

function getDesignerForMarketplace(design) {
  const ownership = designOwners.get(String(design.id));
  if (!ownership) {
    return {
      id: null,
      displayName: 'Unknown Designer'
    };
  }
  const id = String(ownership.userId);
  return {
    id,
    displayName: toDisplayName(id)
  };
}

function toPriceCents(price) {
  if (price === null || price === undefined) return 0;
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric * 100));
}

function shapeMarketplaceRecord(design, role, conversionLookup) {
  const base = {
    id: String(design.id),
    title: String(design.title || 'Untitled'),
    thumbnailUrl: String(design.thumbnailUrl || ''),
    category: String(design.category || ''),
    badges: resolveBadges(design),
    priceCents: toPriceCents(design.price),
    premium: Boolean(design.premium),
    designer: getDesignerForMarketplace(design)
  };

  if (role === 'creator') {
    base.flags = {
      isAdminTemplate: Boolean(design.isAdminTemplate),
      managedByAdminId: design.managedByAdminId ? String(design.managedByAdminId) : null
    };
  }

  if (role === 'admin') {
    const visibility = getVisibility(design);
    base.visibility = visibility;
    const rate = conversionLookup?.get(String(design.id));
    base.conversionRate = typeof rate === 'number' && Number.isFinite(rate) ? rate : 0;
    base.managedByAdminId = design.managedByAdminId ? String(design.managedByAdminId) : null;
    const normalizedStatus =
      typeof design.status === 'string' ? design.status.trim().toLowerCase() : '';
    base.status = normalizedStatus || 'draft';
  }

  return base;
}

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

export async function getMarketplaceDesigns(filters = {}) {
  const { role, category, search, ownerId, mine, requestingUserId } = filters;
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';

  if (!MARKETPLACE_ROLES.has(normalizedRole)) {
    throw new Error(`Unsupported marketplace role: ${role}`);
  }

  let records = Array.from(designs.values()).filter((design) => isVisibleForRole(design, normalizedRole));

  if (category) {
    const normalizedCategory = String(category).trim().toLowerCase();
    if (normalizedCategory) {
      records = records.filter(
        (design) => String(design.category || '').trim().toLowerCase() === normalizedCategory
      );
    }
  }

  if (search) {
    const query = String(search).trim().toLowerCase();
    if (query) {
      records = records.filter((design) => {
        const designer = getDesignerForMarketplace(design);
        return (
          String(design.title || '').toLowerCase().includes(query) ||
          String(design.category || '').toLowerCase().includes(query) ||
          String(designer.displayName || '').toLowerCase().includes(query)
        );
      });
    }
  }

  const normalizeOwnerValue = (value) => {
    if (value === null || value === undefined) return '';
    const raw = String(value).trim();
    return raw ? raw.toLowerCase() : '';
  };

  const normalizedOwnerId = normalizeOwnerValue(ownerId);
  const normalizedRequestingUserId = normalizeOwnerValue(requestingUserId);
  const normalizedMine = typeof mine === 'string'
    ? ['1', 'true', 'yes', 'y'].includes(mine.trim().toLowerCase())
    : Boolean(mine);
  const ownerFilterId = normalizedOwnerId || (normalizedMine ? normalizedRequestingUserId : '');

  if (ownerFilterId) {
    records = records.filter((design) => {
      const ownership = designOwners.get(String(design.id));
      if (!ownership) return false;
      return normalizeOwnerValue(ownership.userId) === ownerFilterId;
    });
  } else if (normalizedMine) {
    // A mine filter was requested but no owner identifier could be resolved.
    records = [];
  }

  records.sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const conversionLookup =
    normalizedRole === 'admin'
      ? new Map(
          getConversionRates().map(({ designId, rate }) => [String(designId), Number(rate) || 0])
        )
      : null;

  return {
    role: normalizedRole,
    data: records.map((design) => shapeMarketplaceRecord(design, normalizedRole, conversionLookup))
  };
}

export { withDesignOwnership };
