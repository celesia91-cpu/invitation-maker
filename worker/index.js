import { getMarketplaceDesigns } from '../server/designs-store.js';
import { resolveMarketplaceRole, isAdminRole, MARKETPLACE_ROLES } from '../shared/marketplace.js';

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getRequestUser(request) {
  const headers = request.headers;
  const role = headers.get('x-user-role') || '';
  const userId = headers.get('x-user-id') || '';
  return {
    id: typeof userId === 'string' ? userId.trim() : '',
    role: typeof role === 'string' ? role.trim() : ''
  };
}

function parseMine(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return ['1', 'true', 'yes', 'y'].includes(trimmed.toLowerCase());
}

async function handleMarketplaceRequest(request) {
  const url = new URL(request.url);
  const user = getRequestUser(request);

  const defaultRole = resolveMarketplaceRole(user.role) || 'consumer';
  if (!MARKETPLACE_ROLES.has(defaultRole)) {
    return jsonResponse(400, { error: 'Unsupported role' });
  }

  let effectiveRole = defaultRole;
  const requestedRoleParam = url.searchParams.get('role');
  if (requestedRoleParam !== null) {
    const requestedRole = resolveMarketplaceRole(requestedRoleParam);
    if (!MARKETPLACE_ROLES.has(requestedRole)) {
      return jsonResponse(400, { error: 'Unsupported role' });
    }
    if (!isAdminRole(defaultRole) && requestedRole !== defaultRole) {
      return jsonResponse(403, { error: 'Forbidden role override' });
    }
    effectiveRole = requestedRole;
  }

  const categoryParam = url.searchParams.get('category');
  const category = categoryParam ? categoryParam.trim() : '';
  if (category && !/^[\w-]+$/.test(category)) {
    return jsonResponse(400, { error: 'Invalid category filter' });
  }

  const searchParam = url.searchParams.get('search');
  const search = searchParam ? searchParam.trim() : '';
  if (search.length > 100) {
    return jsonResponse(400, { error: 'Search query too long' });
  }

  const ownerIdParam = url.searchParams.get('ownerId');
  const ownerId = ownerIdParam ? ownerIdParam.trim() : '';
  const mineParam = url.searchParams.get('mine');
  const mineRequested = parseMine(mineParam);

  const payload = await getMarketplaceDesigns({
    role: effectiveRole,
    category: category || undefined,
    search: search || undefined,
    ownerId: ownerId || undefined,
    mine: mineRequested,
    requestingUserId: user.id || undefined
  });

  return jsonResponse(200, payload);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/marketplace') {
      return handleMarketplaceRequest(request);
    }
    return new Response('Not Found', { status: 404 });
  }
};

export { handleMarketplaceRequest };
