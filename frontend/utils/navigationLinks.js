import { resolveRole } from './roleCapabilities.js';

const BASE_NAV_LINKS = [
  { key: 'marketplace', href: '/', label: 'Marketplace' },
];

const CREATOR_NAV_LINKS = [
  { key: 'editor', href: '/editor', label: 'Editor' },
];

const ADMIN_NAV_LINKS = [
  { key: 'admin-dashboard', href: '/admin/dashboard', label: 'Admin Dashboard' },
];

const ROLE_BREADCRUMB_WAYPOINTS = {
  admin: [
    { key: 'marketplace', href: '/', label: 'Marketplace' },
    { key: 'admin-dashboard', href: '/admin/dashboard', label: 'Admin Dashboard' },
  ],
  creator: [
    { key: 'marketplace', href: '/', label: 'Marketplace' },
    { key: 'editor', href: '/editor', label: 'Editor' },
  ],
};

function dedupeLinks(links) {
  const seen = new Set();
  const result = [];
  for (const link of links) {
    if (!link || typeof link.href !== 'string') {
      continue;
    }
    const href = link.href.trim();
    if (!href || seen.has(href)) {
      continue;
    }
    seen.add(href);
    result.push({
      key: link.key ?? href,
      href,
      label: typeof link.label === 'string' && link.label.trim() ? link.label : href,
    });
  }
  return result;
}

export function getRoleNavigationLinks(role) {
  const resolvedRole = resolveRole(role);
  const links = [...BASE_NAV_LINKS];

  if (resolvedRole === 'creator' || resolvedRole === 'admin') {
    links.push(...CREATOR_NAV_LINKS);
  }

  if (resolvedRole === 'admin') {
    links.push(...ADMIN_NAV_LINKS);
  }

  return dedupeLinks(links);
}

export function getRoleBreadcrumbWaypoints(role) {
  const resolvedRole = resolveRole(role);
  if (resolvedRole === 'admin') {
    return dedupeLinks(ROLE_BREADCRUMB_WAYPOINTS.admin);
  }
  if (resolvedRole === 'creator') {
    return dedupeLinks(ROLE_BREADCRUMB_WAYPOINTS.creator);
  }
  return dedupeLinks(ROLE_BREADCRUMB_WAYPOINTS.creator.slice(0, 1));
}
