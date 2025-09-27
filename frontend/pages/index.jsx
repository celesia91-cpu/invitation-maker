import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AuthModal from '../components/AuthModal.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PreviewModal from '../components/PreviewModal.jsx';
import PurchaseModal from '../components/PurchaseModal.jsx';
import DesignSelectionModal from '../components/DesignSelectionModal.jsx';
import TransitionLoader from '../components/TransitionLoader.jsx';
import Marketplace from '../components/Marketplace.jsx';
import withRoleGate from '../components/withRoleGate.jsx';
import { useAppState } from '../context/AppStateContext.jsx';
import useAuth from '../hooks/useAuth.js';
import useDesignOwnership from '../hooks/useDesignOwnership.js';
import { usePageNavigation } from '../utils/navigationManager.js';

const DEFAULT_MARKETPLACE_DESIGN_ID = 'demo-marketplace-design';

const MARKETPLACE_ALLOWED_ROLES = ['guest', 'user', 'consumer', 'creator', 'admin'];

function MarketplaceForbidden({ isOpen, userRole }) {
  const roleLabel = typeof userRole === 'string' && userRole.trim() ? userRole : 'unknown';
  return (
    <div id="marketplacePage" className={`page${isOpen ? '' : ' hidden'}`}>
      <div className="forbidden-placeholder" role="alert" data-testid="marketplace-forbidden">
        Marketplace access is unavailable for the “{roleLabel}” role.
      </div>
    </div>
  );
}

const RoleAwareMarketplace = withRoleGate(Marketplace, {
  allowedRoles: MARKETPLACE_ALLOWED_ROLES,
  fallback: MarketplaceForbidden,
});

export default function MarketplacePage() {
  const router = useRouter();
  const auth = useAuth();
  const { pushNavigationHistory } = useAppState();
  const { goToEditor } = usePageNavigation();
  const {
    setCurrentDesignId,
    isDesignOwned,
    currentDesignId,
  } = useDesignOwnership();

  const setCurrentDesignIdRef = useRef(setCurrentDesignId);

  useEffect(() => {
    setCurrentDesignIdRef.current = setCurrentDesignId;
  }, [setCurrentDesignId]);
  // Auto-open auth if there is no active session
  const [showAuth, setShowAuth] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showDesignSelection, setShowDesignSelection] = useState(false);
  const [activeDesignId, setActiveDesignId] = useState(DEFAULT_MARKETPLACE_DESIGN_ID);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isTopbarVisible, setIsTopbarVisible] = useState(false);
  const [currentSurface, setCurrentSurface] = useState('marketplace');
  const [recentDesigns, setRecentDesigns] = useState([]);
  const [myDesigns, setMyDesigns] = useState([]);
  const [showTransitionLoader, setShowTransitionLoader] = useState(false);
  const [transitionInfo, setTransitionInfo] = useState({ title: '', subtitle: '' });

  useEffect(() => {
    if (!auth.isInitialized) return;
    setShowAuth(!auth.isAuthenticated);
  }, [auth.isAuthenticated, auth.isInitialized]);

  const isUserAuthenticated = Boolean(auth?.isAuthenticated);
  const userRole = auth?.user?.role || 'guest';

  const syncDesignSelection = useCallback(
    (designId, options = {}) => {
      const allowBlank = Boolean(options.allowBlank);
      const shouldUpdateGlobal =
        options && Object.prototype.hasOwnProperty.call(options, 'updateGlobal')
          ? Boolean(options.updateGlobal)
          : isUserAuthenticated;
      const candidate =
        designId !== undefined
          ? designId
          : activeDesignId !== undefined && activeDesignId !== null
            ? activeDesignId
            : currentDesignId;

      if (allowBlank) {
        const blank = candidate === null || candidate === undefined || `${candidate}`.trim() === '';
        if (blank) {
          if (activeDesignId !== null) {
            setActiveDesignId(null);
          }
          if (shouldUpdateGlobal) {
            const updateCurrentDesignId = setCurrentDesignIdRef.current;
            if (typeof updateCurrentDesignId === 'function') {
              updateCurrentDesignId(null);
            }
          }
          return null;
        }
      }

      const fallback =
        candidate === null || candidate === undefined || `${candidate}`.trim() === ''
          ? DEFAULT_MARKETPLACE_DESIGN_ID
          : candidate;
      const normalized = `${fallback}`.trim();

      if (!normalized) {
        if (activeDesignId !== null) {
          setActiveDesignId(null);
        }
        if (shouldUpdateGlobal) {
          const updateCurrentDesignId = setCurrentDesignIdRef.current;
          if (typeof updateCurrentDesignId === 'function') {
            updateCurrentDesignId(null);
          }
        }
        return null;
      }

      if (activeDesignId !== normalized) {
        setActiveDesignId(normalized);
      }

      if (shouldUpdateGlobal && currentDesignId !== normalized) {
        const updateCurrentDesignId = setCurrentDesignIdRef.current;
        if (typeof updateCurrentDesignId === 'function') {
          updateCurrentDesignId(normalized);
        }
      }

      return normalized;
    },
    [activeDesignId, currentDesignId, isUserAuthenticated]
  );


  useEffect(() => {
    if (auth.isAuthenticated) {
      return;
    }

    if (
      activeDesignId === DEFAULT_MARKETPLACE_DESIGN_ID &&
      currentDesignId === DEFAULT_MARKETPLACE_DESIGN_ID
    ) {
      return;
    }

    syncDesignSelection(DEFAULT_MARKETPLACE_DESIGN_ID);
  }, [auth.isAuthenticated, activeDesignId, currentDesignId, syncDesignSelection]);

  const ensureDesignId = useCallback(
    () => syncDesignSelection(undefined),
    [syncDesignSelection]
  );

  const navigateToEditor = useCallback(
    (designId, options = {}) => {
      const resolvedDesignId = syncDesignSelection(designId, options);
      goToEditor(resolvedDesignId, { preserveState: true });
    },
    [goToEditor, syncDesignSelection]
  );

  const openInlineExperience = useCallback(() => {
    setCurrentSurface('inline-experience');
    setPanelOpen(true);
    setIsTopbarVisible(true);

    if (typeof pushNavigationHistory === 'function') {
      pushNavigationHistory({ href: '/inline-experience', label: 'Inline Experience' });
    }
  }, [pushNavigationHistory]);

  useEffect(() => {
    if (currentSurface === 'marketplace') {
      setPanelOpen(false);
      setIsTopbarVisible(false);
    }
  }, [currentSurface]);

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => !prev);
  }, []);

  const handleReturnToMarketplace = useCallback(() => {
    setShowPreview(false);
    setShowPurchase(false);
    setPanelOpen(false);
    setIsTopbarVisible(false);
    setCurrentSurface('marketplace');

    if (typeof pushNavigationHistory === 'function') {
      pushNavigationHistory({ href: '/', label: 'Marketplace' });
    }

    if (router && typeof router.push === 'function') {
      router.push('/');
    }
  }, [pushNavigationHistory, router]);

  const isMarketplaceOpen = currentSurface === 'marketplace';

  const handleShareClick = useCallback(() => {
    const designId = ensureDesignId();
    if (designId && isDesignOwned(designId)) {
      navigateToEditor(designId);
    } else {
      setShowPurchase(true);
    }
  }, [ensureDesignId, isDesignOwned, navigateToEditor]);

  // Load recent designs and my designs for authenticated users
  useEffect(() => {
    if (!isUserAuthenticated || !auth?.api) return;

    const loadUserDesigns = async () => {
      try {
        // Load recent designs (mock data for now)
        const recentMockData = [
          {
            id: 'recent-1',
            title: 'Birthday Party Invitation',
            thumbnail: '/images/recent-1.png',
            lastOpened: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
            owned: true,
          },
          {
            id: 'recent-2',
            title: 'Wedding Save the Date',
            thumbnail: '/images/recent-2.png',
            lastOpened: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
            owned: false,
          },
        ];
        setRecentDesigns(recentMockData);

        // Load my designs for creators/admins (mock data)
        if (userRole === 'creator' || userRole === 'admin') {
          const myDesignsMockData = [
            {
              id: 'my-design-1',
              title: 'Corporate Event Template',
              thumbnail: '/images/my-design-1.png',
              status: 'published',
              lastModified: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
              views: 245,
              downloads: 12,
            },
            {
              id: 'my-design-2',
              title: 'Holiday Celebration',
              thumbnail: '/images/my-design-2.png',
              status: 'draft',
              lastModified: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
              views: 0,
              downloads: 0,
            },
          ];
          setMyDesigns(myDesignsMockData);
        }
      } catch (error) {
        // Error logged for debugging
      }
    };

    loadUserDesigns();
  }, [isUserAuthenticated, auth?.api, userRole]);

  const handleDesignSelection = useCallback((designId, options = {}) => {
    setShowDesignSelection(false);

    // Set up transition loader based on selection type
    let title = 'Loading Editor...';
    let subtitle = '';

    if (options.type === 'blank') {
      title = 'Creating Blank Canvas';
      subtitle = 'Setting up your workspace';
    } else if (options.type === 'template') {
      title = 'Loading Template';
      subtitle = `Preparing "${options.template?.name || 'template'}"`;
    } else if (options.type === 'my_design') {
      title = 'Opening Your Design';
      subtitle = `Loading "${options.design?.title || 'your design'}"`;
    } else if (options.type === 'recent') {
      title = 'Resuming Work';
      subtitle = `Opening "${options.design?.title || 'recent design'}"`;
    }

    setTransitionInfo({ title, subtitle });
    setShowTransitionLoader(true);

    // Simulate loading delay and then navigate
    setTimeout(() => {
      if (options.type === 'blank') {
        navigateToEditor(null, { allowBlank: true });
      } else if (options.type === 'template') {
        navigateToEditor(designId, { template: options.template });
      } else if (options.type === 'my_design' || options.type === 'recent') {
        navigateToEditor(designId, { owned: options.owned });
      } else {
        navigateToEditor(designId, options);
      }
      setShowTransitionLoader(false);
    }, 1800);
  }, [navigateToEditor]);

  return (
    <div
      data-testid="marketplace-root"
      data-panel-open={panelOpen ? 'true' : 'false'}
      data-topbar-visible={isTopbarVisible ? 'true' : 'false'}
    >
      {/* Authentication Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {/* Breadcrumbs */}
      <Breadcrumbs />

      <div className="marketplace-inline-actions" style={{ margin: '16px 0' }}>
        <button
          type="button"
          className="btn"
          onClick={openInlineExperience}
          aria-controls="inlineExperience"
        >
          Open inline experience
        </button>
      </div>

      {isTopbarVisible && (
        <div
          className="inline-experience-topbar"
          data-testid="inline-experience-topbar"
          role="region"
          aria-label="Inline experience controls"
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <button type="button" className="btn" onClick={handleReturnToMarketplace}>
            Back to Marketplace
          </button>
          <button
            type="button"
            className="btn"
            onClick={togglePanel}
            aria-pressed={panelOpen}
          >
            {panelOpen ? 'Hide Panel' : 'Show Panel'}
          </button>
        </div>
      )}

      {currentSurface !== 'marketplace' && (
        <div
          id="inlineExperience"
          className="inline-experience"
          data-testid="inline-experience"
          data-panel-open={panelOpen ? 'true' : 'false'}
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <p style={{ marginBottom: 12 }}>
            This inline experience represents an editor view. Use the controls above to return to the
            marketplace.
          </p>
          <div
            className="inline-experience-panel"
            data-testid="inline-experience-panel"
            style={{
              display: panelOpen ? 'block' : 'none',
              padding: 12,
              background: '#f8fafc',
              borderRadius: 8,
            }}
          >
            Panel content is visible while the panel is open.
          </div>
          {!panelOpen && (
            <div
              className="inline-experience-panel"
              data-testid="inline-experience-panel-collapsed"
              aria-hidden="true"
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px dashed #cbd5f5',
                color: '#475569',
              }}
            >
              Panel content is hidden while the panel is collapsed.
            </div>
          )}
        </div>
      )}

      {/* Marketplace page (hidden by default) */}
      <RoleAwareMarketplace
        isOpen={isMarketplaceOpen}
        onSkipToEditor={() => setShowDesignSelection(true)}
      />

      {/* Global modals */}
      <PreviewModal
        isOpen={showPreview}
        designId={activeDesignId}
        onClose={() => setShowPreview(false)}
        onUseDesign={({ designId, owned }) => {
          const nextDesignId = syncDesignSelection(designId);
          if (owned) {
            setShowPreview(false);
            navigateToEditor(nextDesignId);
          } else {
            setShowPreview(false);
            setShowPurchase(true);
          }
        }}
      />
      <PurchaseModal
        isOpen={showPurchase}
        designId={activeDesignId}
        onConfirm={({ designId, owned }) => {
          const nextDesignId = syncDesignSelection(designId);
          setShowPurchase(false);
          if (owned) {
            navigateToEditor(nextDesignId);
          }
        }}
        onCancel={() => setShowPurchase(false)}
      />

      {/* Design Selection Modal */}
      <DesignSelectionModal
        isOpen={showDesignSelection}
        onClose={() => setShowDesignSelection(false)}
        onSelectDesign={handleDesignSelection}
        userRole={userRole}
        recentDesigns={recentDesigns}
        myDesigns={myDesigns}
      />

      {/* Transition Loader */}
      <TransitionLoader
        isVisible={showTransitionLoader}
        title={transitionInfo.title}
        subtitle={transitionInfo.subtitle}
        onComplete={() => setShowTransitionLoader(false)}
      />
    </div>
  );
}

