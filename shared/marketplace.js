const MARKETPLACE_ROLE_ALIASES = new Map([
  ['user', 'consumer']
]);

export const MARKETPLACE_ROLES = new Set(['creator', 'consumer', 'admin']);

function normalizeRole(role = '') {
  return String(role || '').trim().toLowerCase();
}

export function resolveMarketplaceRole(role = '') {
  const normalized = normalizeRole(role);
  if (!normalized) return '';
  return MARKETPLACE_ROLE_ALIASES.get(normalized) || normalized;
}

export function isAdminRole(role = '') {
  return normalizeRole(role) === 'admin';
}
