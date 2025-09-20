import { cloneElement, isValidElement } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

function normalizeRole(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

export default function withRoleGate(WrappedComponent, options = {}) {
  if (typeof WrappedComponent !== 'function') {
    throw new TypeError('withRoleGate expects a component function');
  }

  const { allowedRoles = [], fallback } = options;
  const normalizedAllowed = Array.isArray(allowedRoles)
    ? allowedRoles
        .map(normalizeRole)
        .filter(Boolean)
    : [];
  const allowedSet = new Set(normalizedAllowed);
  const fallbackElement = fallback;
  const wrappedName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function RoleGatedComponent(props) {
    const { userRole } = useAppState();
    const normalizedRole = normalizeRole(userRole);
    const isAllowed = allowedSet.size > 0 && allowedSet.has(normalizedRole);

    if (isAllowed) {
      return <WrappedComponent {...props} />;
    }

    if (typeof fallbackElement === 'function') {
      const FallbackComponent = fallbackElement;
      return <FallbackComponent {...props} userRole={userRole} />;
    }

    if (isValidElement(fallbackElement)) {
      const elementType = fallbackElement.type;
      if (typeof elementType === 'string') {
        return fallbackElement;
      }
      return cloneElement(fallbackElement, { ...props, userRole });
    }

    return fallbackElement ?? null;
  }

  RoleGatedComponent.displayName = `withRoleGate(${wrappedName})`;

  return RoleGatedComponent;
}
