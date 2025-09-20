import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAppState, formatNavigationLabel } from '../context/AppStateContext.jsx';
import { getRoleBreadcrumbWaypoints } from '../utils/navigationLinks.js';

export default function Breadcrumbs() {
  const router = useRouter();
  const { navigationHistory, userRole } = useAppState();

  const historyItems = useMemo(() => {
    if (Array.isArray(navigationHistory) && navigationHistory.length > 0) {
      return navigationHistory;
    }

    const href = router?.asPath || router?.pathname || '/';
    return [
      {
        href,
        label: formatNavigationLabel(href),
      },
    ];
  }, [navigationHistory, router?.asPath, router?.pathname]);

  const roleWaypoints = useMemo(
    () => getRoleBreadcrumbWaypoints(userRole),
    [userRole]
  );

  const items = useMemo(() => {
    const combined = [];
    const seen = new Set();

    const append = (entry) => {
      if (!entry || typeof entry.href !== 'string') {
        return;
      }

      const href = entry.href.trim();
      if (!href || seen.has(href)) {
        return;
      }

      seen.add(href);
      combined.push({
        href,
        label:
          typeof entry.label === 'string' && entry.label.trim()
            ? entry.label
            : formatNavigationLabel(href),
      });
    };

    roleWaypoints.forEach(append);
    historyItems.forEach(append);

    return combined;
  }, [historyItems, roleWaypoints]);

  return (
    <nav id="breadcrumbs" className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.href}-${index}`}>
              <a href={item.href} aria-current={isCurrent ? 'page' : undefined}>
                {item.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

