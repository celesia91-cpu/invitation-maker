const CREATOR_ROLES = new Set(['creator', 'admin']);

export function normalizeRole(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

export function resolveRole(value, fallback = 'guest') {
  const normalized = normalizeRole(value);
  if (normalized) {
    return normalized;
  }
  return typeof fallback === 'string' && fallback.trim() ? fallback.trim().toLowerCase() : 'guest';
}

export function roleHasEditorAccess(role) {
  return CREATOR_ROLES.has(normalizeRole(role));
}

export function resolveCapabilities({ role, canEdit } = {}, fallbackRole) {
  const resolvedRole = resolveRole(role, fallbackRole);
  const resolvedCanEdit = typeof canEdit === 'boolean' ? canEdit : roleHasEditorAccess(resolvedRole);
  return {
    role: resolvedRole,
    canEdit: resolvedCanEdit,
  };
}

export const CREATOR_CAPABLE_ROLES = Array.from(CREATOR_ROLES);
