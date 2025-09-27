import { useState, useCallback, useMemo } from 'react';
import useAuth from '../hooks/useAuth.js';

const DESIGN_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch with a blank design',
    thumbnail: '/images/blank-template.png',
    category: 'basic',
    isPremium: false,
  },
  {
    id: 'birthday-modern',
    name: 'Modern Birthday',
    description: 'Clean and modern birthday invitation',
    thumbnail: '/images/birthday-modern.png',
    category: 'birthday',
    isPremium: false,
  },
  {
    id: 'wedding-elegant',
    name: 'Elegant Wedding',
    description: 'Sophisticated wedding invitation',
    thumbnail: '/images/wedding-elegant.png',
    category: 'wedding',
    isPremium: true,
  },
  {
    id: 'corporate-professional',
    name: 'Professional Event',
    description: 'Business event invitation',
    thumbnail: '/images/corporate-professional.png',
    category: 'corporate',
    isPremium: true,
  },
];

const SELECTION_MODES = {
  QUICK_START: 'quick_start',
  BROWSE_ALL: 'browse_all',
  MY_DESIGNS: 'my_designs',
  RECENT: 'recent',
};

export default function DesignSelectionModal({
  isOpen,
  onClose,
  onSelectDesign,
  userRole = 'guest',
  recentDesigns = [],
  myDesigns = [],
}) {
  const auth = useAuth();
  const [selectionMode, setSelectionMode] = useState(SELECTION_MODES.QUICK_START);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewDesign, setPreviewDesign] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const isAdmin = userRole === 'admin';
  const isCreator = userRole === 'creator' || isAdmin;
  const isAuthenticated = Boolean(auth?.isAuthenticated);

  // Filter available templates based on user role
  const availableTemplates = useMemo(() => {
    return DESIGN_TEMPLATES.filter(template => {
      // Premium templates require creator or admin role
      if (template.isPremium && !isCreator) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && template.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          template.name.toLowerCase().includes(searchLower) ||
          template.description.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [isCreator, selectedCategory, searchTerm]);

  const categories = useMemo(() => [
    { id: 'all', label: 'All Templates' },
    { id: 'basic', label: 'Basic' },
    { id: 'birthday', label: 'Birthday' },
    { id: 'wedding', label: 'Wedding' },
    { id: 'corporate', label: 'Corporate' },
  ], []);

  const quickStartOptions = useMemo(() => [
    {
      id: 'blank',
      title: 'Start from Blank',
      description: 'Create your own design from scratch',
      icon: '🎨',
      action: () => onSelectDesign(null, { type: 'blank' }),
    },
    ...(isAuthenticated ? [
      {
        id: 'template',
        title: 'Use Template',
        description: 'Choose from our curated templates',
        icon: '📋',
        action: () => setSelectionMode(SELECTION_MODES.BROWSE_ALL),
      },
      {
        id: 'recent',
        title: 'Recent Designs',
        description: `Continue working on recent projects (${recentDesigns.length})`,
        icon: '⏱️',
        action: () => setSelectionMode(SELECTION_MODES.RECENT),
        disabled: recentDesigns.length === 0,
      },
    ] : []),
    ...(isCreator ? [
      {
        id: 'my_designs',
        title: 'My Designs',
        description: `Open your saved designs (${myDesigns.length})`,
        icon: '💼',
        action: () => setSelectionMode(SELECTION_MODES.MY_DESIGNS),
        disabled: myDesigns.length === 0,
      },
    ] : []),
  ], [isAuthenticated, isCreator, recentDesigns.length, myDesigns.length, onSelectDesign, setSelectionMode]);

  const handleTemplateSelect = useCallback((template) => {
    onSelectDesign(template.id, {
      type: 'template',
      template,
      category: template.category,
    });
  }, [onSelectDesign]);

  const handleTemplatePreview = useCallback((template, event) => {
    event.stopPropagation();
    setPreviewDesign(template);
    setShowPreview(true);
  }, []);

  const handleMyDesignSelect = useCallback((design) => {
    onSelectDesign(design.id, {
      type: 'my_design',
      design,
      owned: true,
    });
  }, [onSelectDesign]);

  const handleRecentDesignSelect = useCallback((design) => {
    onSelectDesign(design.id, {
      type: 'recent',
      design,
    });
  }, [onSelectDesign]);

  const renderQuickStart = () => (
    <div className="design-selection-quick-start">
      <h3>How would you like to start?</h3>
      <div className="quick-start-grid">
        {quickStartOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`quick-start-option ${option.disabled ? 'disabled' : ''}`}
            onClick={option.action}
            disabled={option.disabled}
          >
            <div className="option-icon">{option.icon}</div>
            <div className="option-content">
              <h4>{option.title}</h4>
              <p>{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderTemplateGrid = () => (
    <div className="design-selection-templates">
      <div className="templates-header">
        <h3>Choose a Template</h3>
        <div className="templates-filters">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="templates-grid">
        {availableTemplates.map((template) => (
          <div
            key={template.id}
            className="template-card"
            onClick={() => handleTemplateSelect(template)}
          >
            <div className="template-thumbnail">
              <img src={template.thumbnail} alt={template.name} />
              {template.isPremium && (
                <div className="premium-badge">Premium</div>
              )}
              <div className="template-actions">
                <button
                  type="button"
                  className="preview-btn"
                  onClick={(e) => handleTemplatePreview(template, e)}
                  title="Preview template"
                >
                  👁️
                </button>
              </div>
            </div>
            <div className="template-info">
              <h4>{template.name}</h4>
              <p>{template.description}</p>
            </div>
          </div>
        ))}
      </div>

      {availableTemplates.length === 0 && (
        <div className="no-templates">
          <p>No templates found matching your criteria.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );

  const renderMyDesigns = () => (
    <div className="design-selection-my-designs">
      <h3>My Designs</h3>
      <div className="designs-grid">
        {myDesigns.map((design) => (
          <div
            key={design.id}
            className="design-card"
            onClick={() => handleMyDesignSelect(design)}
          >
            <div className="design-thumbnail">
              {design.thumbnail ? (
                <img src={design.thumbnail} alt={design.title} />
              ) : (
                <div className="placeholder-thumbnail">
                  <span>📄</span>
                </div>
              )}
              <div className={`status-badge ${design.status}`}>
                {design.status === 'published' ? '✅' : design.status === 'draft' ? '📝' : '⏳'}
              </div>
            </div>
            <div className="design-info">
              <h4>{design.title}</h4>
              <p>Last modified: {new Date(design.lastModified).toLocaleDateString()}</p>
              <div className="design-stats">
                <span>{design.views || 0} views</span>
                {design.status === 'published' && <span>{design.downloads || 0} downloads</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRecentDesigns = () => (
    <div className="design-selection-recent">
      <h3>Recent Designs</h3>
      <div className="designs-list">
        {recentDesigns.map((design) => (
          <div
            key={design.id}
            className="recent-design-item"
            onClick={() => handleRecentDesignSelect(design)}
          >
            <div className="design-thumbnail-small">
              {design.thumbnail ? (
                <img src={design.thumbnail} alt={design.title} />
              ) : (
                <span>📄</span>
              )}
            </div>
            <div className="design-details">
              <h4>{design.title}</h4>
              <p>Opened {new Date(design.lastOpened).toLocaleDateString()}</p>
              <div className="design-type">
                {design.owned ? '💼 My Design' : '📋 Template'}
              </div>
            </div>
            <div className="design-actions">
              <button type="button" className="btn btn-small">
                Continue
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="design-selection-modal" role="dialog" aria-labelledby="design-selection-title">
        <header className="modal-header">
          <h2 id="design-selection-title">Choose Your Starting Point</h2>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="modal-navigation">
          <button
            type="button"
            className={`nav-btn ${selectionMode === SELECTION_MODES.QUICK_START ? 'active' : ''}`}
            onClick={() => setSelectionMode(SELECTION_MODES.QUICK_START)}
          >
            Quick Start
          </button>
          {isAuthenticated && (
            <>
              <button
                type="button"
                className={`nav-btn ${selectionMode === SELECTION_MODES.BROWSE_ALL ? 'active' : ''}`}
                onClick={() => setSelectionMode(SELECTION_MODES.BROWSE_ALL)}
              >
                Browse Templates
              </button>
              {recentDesigns.length > 0 && (
                <button
                  type="button"
                  className={`nav-btn ${selectionMode === SELECTION_MODES.RECENT ? 'active' : ''}`}
                  onClick={() => setSelectionMode(SELECTION_MODES.RECENT)}
                >
                  Recent ({recentDesigns.length})
                </button>
              )}
              {isCreator && myDesigns.length > 0 && (
                <button
                  type="button"
                  className={`nav-btn ${selectionMode === SELECTION_MODES.MY_DESIGNS ? 'active' : ''}`}
                  onClick={() => setSelectionMode(SELECTION_MODES.MY_DESIGNS)}
                >
                  My Designs ({myDesigns.length})
                </button>
              )}
            </>
          )}
        </div>

        <div className="modal-content">
          {selectionMode === SELECTION_MODES.QUICK_START && renderQuickStart()}
          {selectionMode === SELECTION_MODES.BROWSE_ALL && renderTemplateGrid()}
          {selectionMode === SELECTION_MODES.MY_DESIGNS && renderMyDesigns()}
          {selectionMode === SELECTION_MODES.RECENT && renderRecentDesigns()}
        </div>

        <footer className="modal-footer">
          <div className="user-info">
            <span className="user-role">Signed in as: {userRole}</span>
            {!isCreator && (
              <span className="upgrade-hint">
                Upgrade to Creator for premium templates
              </span>
            )}
          </div>
        </footer>
      </div>

      {/* Design Preview Modal */}
      {showPreview && previewDesign && (
        <div
          className="preview-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setShowPreview(false)}
        >
          <div className="design-preview-modal" role="dialog" aria-labelledby="preview-title">
            <header className="preview-header">
              <h3 id="preview-title">{previewDesign.name}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowPreview(false)}
                aria-label="Close preview"
              >
                ×
              </button>
            </header>

            <div className="preview-content">
              <div className="preview-image">
                <img src={previewDesign.thumbnail} alt={previewDesign.name} />
              </div>

              <div className="preview-details">
                <div className="preview-info">
                  <p className="preview-description">{previewDesign.description}</p>
                  <div className="preview-metadata">
                    <span className="preview-category">Category: {previewDesign.category}</span>
                    {previewDesign.isPremium && (
                      <span className="preview-premium">✨ Premium Template</span>
                    )}
                  </div>
                </div>

                <div className="preview-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPreview(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      handleTemplateSelect(previewDesign);
                      setShowPreview(false);
                    }}
                  >
                    Use This Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}