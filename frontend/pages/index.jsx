import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AuthModal from '../components/AuthModal.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PreviewModal from '../components/PreviewModal.jsx';
import PurchaseModal from '../components/PurchaseModal.jsx';
import Marketplace from '../components/Marketplace.jsx';
import withRoleGate from '../components/withRoleGate.jsx';
import useAuth from '../hooks/useAuth.js';
import useDesignOwnership from '../hooks/useDesignOwnership.js';

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
  const {
    setCurrentDesignId,
    isDesignOwned,
    currentDesignId,
  } = useDesignOwnership();
  // Auto-open auth if there is no active session
  const [showAuth, setShowAuth] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [activeDesignId, setActiveDesignId] = useState(DEFAULT_MARKETPLACE_DESIGN_ID);

  useEffect(() => {
    if (!auth.isAuthenticated) setShowAuth(true);
  }, [auth.isAuthenticated]);

  const syncDesignSelection = useCallback(
    (designId, options = {}) => {
      const allowBlank = Boolean(options.allowBlank);
      const candidate =
        designId !== undefined
          ? designId
          : activeDesignId !== undefined && activeDesignId !== null
            ? activeDesignId
            : currentDesignId;

      if (allowBlank) {
        const blank = candidate === null || candidate === undefined || `${candidate}`.trim() === '';
        if (blank) {
          setActiveDesignId(null);
          setCurrentDesignId(null);
          return null;
        }
      }

      const fallback =
        candidate === null || candidate === undefined || `${candidate}`.trim() === ''
          ? DEFAULT_MARKETPLACE_DESIGN_ID
          : candidate;
      const normalized = `${fallback}`.trim();

      if (!normalized) {
        setActiveDesignId(null);
        setCurrentDesignId(null);
        return null;
      }

      setActiveDesignId(normalized);
      setCurrentDesignId(normalized);
      return normalized;
    },
    [activeDesignId, currentDesignId, setCurrentDesignId]
  );

  useEffect(() => {
    if (!auth.isAuthenticated) {
      syncDesignSelection(DEFAULT_MARKETPLACE_DESIGN_ID);
    }
  }, [auth.isAuthenticated, syncDesignSelection]);

  const ensureDesignId = useCallback(
    () => syncDesignSelection(undefined),
    [syncDesignSelection]
  );

  const navigateToEditor = useCallback(
    (designId, options = {}) => {
      const resolvedDesignId = syncDesignSelection(designId, options);
      const href =
        resolvedDesignId && resolvedDesignId.length > 0
          ? `/editor/${encodeURIComponent(resolvedDesignId)}`
          : '/editor';
      router.push(href);
    },
    [router, syncDesignSelection]
  );

  const handleShareClick = useCallback(() => {
    const designId = ensureDesignId();
    if (designId && isDesignOwned(designId)) {
      navigateToEditor(designId);
    } else {
      setShowPurchase(true);
    }
  }, [ensureDesignId, isDesignOwned, navigateToEditor]);

  return (
    <div>
      {/* Authentication Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Marketplace page (hidden by default) */}
      <RoleAwareMarketplace
        isOpen
        onSkipToEditor={() => navigateToEditor(null, { allowBlank: true })}
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
    </div>
  );
}

