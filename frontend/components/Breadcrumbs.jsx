import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAppState, formatNavigationLabel } from '../context/AppStateContext.jsx';

export default function Breadcrumbs() {
  const router = useRouter();
  const { navigationHistory } = useAppState();

  const items = useMemo(() => {
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

