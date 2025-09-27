import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAppState, formatNavigationLabel } from '../context/AppStateContext.jsx';
import { getRoleBreadcrumbWaypoints } from '../utils/navigationLinks.js';
import { usePageNavigation } from '../utils/navigationManager.js';

export default function Breadcrumbs() {
  const router = useRouter();
  const { navigationHistory, userRole } = useAppState();
  const { navigate, canGoBack } = usePageNavigation();

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

  const handleBreadcrumbClick = (href, event) => {
    event.preventDefault();
    navigate(href);
  };

  return (
    <nav id="breadcrumbs" className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          const isClickable = !isCurrent && canGoBack;

          return (
            <li key={`${item.href}-${index}`}>
              {isClickable ? (
                <button
                  type="button"
                  className="breadcrumb-link"
                  onClick={(e) => handleBreadcrumbClick(item.href, e)}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={isCurrent ? 'breadcrumb-current' : 'breadcrumb-text'}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {canGoBack && items.length > 1 && (
        <button
          type="button"
          className="breadcrumb-back-btn"
          onClick={() => navigate(items[items.length - 2]?.href)}
          title="Go back"
          aria-label="Go back to previous page"
        >
          ← Back
        </button>
      )}
    </nav>
  );
}

