import ErrorBoundary from './ErrorBoundary.jsx';

// Specialized error boundary for specific features
export default function FeatureErrorBoundary({
  children,
  featureName = 'Feature',
  fallbackMessage,
  showReload = false,
  onError
}) {
  const handleError = (error, errorInfo) => {
    // Log feature-specific error
    console.error(`${featureName} Error:`, error);

    // Call parent error handler if provided
    if (onError) {
      onError(error, errorInfo, featureName);
    }
  };

  const fallback = (error, reset) => (
    <div className="feature-error-boundary" style={{
      padding: '1.5rem',
      border: '1px solid #fed7d7',
      borderRadius: '6px',
      backgroundColor: '#fef5e7',
      margin: '0.5rem 0'
    }}>
      <h3 style={{ color: '#c53030', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
        ⚠️ {featureName} Unavailable
      </h3>
      <p style={{ marginBottom: '1rem', color: '#744210' }}>
        {fallbackMessage || `The ${featureName.toLowerCase()} feature encountered an error and couldn't load properly.`}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.4rem 0.8rem',
          backgroundColor: '#d69e2e',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}
      >
        Retry {featureName}
      </button>
      {showReload && (
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.4rem 0.8rem',
            backgroundColor: '#38a169',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginLeft: '0.5rem'
          }}
        >
          Reload Page
        </button>
      )}
    </div>
  );

  return (
    <ErrorBoundary
      fallback={fallback}
      onError={handleError}
      showReload={showReload}
    >
      {children}
    </ErrorBoundary>
  );
}