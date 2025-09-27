import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { AppStateProvider, useAppState, formatNavigationLabel } from '../context/AppStateContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import '../styles/globals.css';
import '../styles/styles.css';

function AppStateRouterBridge() {
  const router = useRouter();
  const { pushNavigationHistory, resetNavigationHistory } = useAppState();
  const pushRef = useRef(pushNavigationHistory);
  const resetRef = useRef(resetNavigationHistory);

  useEffect(() => {
    pushRef.current = pushNavigationHistory;
  }, [pushNavigationHistory]);

  useEffect(() => {
    resetRef.current = resetNavigationHistory;
  }, [resetNavigationHistory]);

  useEffect(() => {
    if (!router || !router.events) {
      return undefined;
    }

    const seedHref = router.asPath || router.pathname || '/';
    resetRef.current();
    pushRef.current({ href: seedHref, label: formatNavigationLabel(seedHref) });

    const handleRouteChange = (url) => {
      pushRef.current({ href: url, label: formatNavigationLabel(url) });
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      resetRef.current();
    };
  }, [router]);

  return null;
}

export default function MyApp({ Component, pageProps }) {
  const handleError = (error, errorInfo) => {
    // In production, send to error reporting service
    console.error('Application Error:', error, errorInfo);
  };

  return (
    <ErrorBoundary
      message="The application encountered an unexpected error. Please try refreshing the page."
      showReload={true}
      onError={handleError}
    >
      <AppStateProvider>
        <ErrorBoundary
          message="There was an error with the application state. Some features may not work correctly."
          onError={handleError}
        >
          <AuthProvider>
            <ErrorBoundary
              message="There was an authentication error. Please try logging in again."
              onError={handleError}
            >
              <AppStateRouterBridge />
              <Component {...pageProps} />
            </ErrorBoundary>
          </AuthProvider>
        </ErrorBoundary>
      </AppStateProvider>
    </ErrorBoundary>
  );
}
