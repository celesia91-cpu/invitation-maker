import { useRef, useState } from 'react';

const CATEGORY_OPTIONS = [
  { id: '', label: 'All' },
  { id: 'popular', label: 'Popular' },
  { id: 'recent', label: 'Recently Added' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recently-viewed', label: 'Recently Viewed' },
  { id: 'Birthday', label: 'Birthday' },
  { id: 'Wedding', label: 'Wedding' },
];

export default function Marketplace({ isOpen, onSkipToEditor }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_OPTIONS[0].id);
  const tabRefs = useRef([]);

  const handleKeyDown = (event, index) => {
    if (CATEGORY_OPTIONS.length === 0) return;

    const { key } = event;

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      const direction = key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (index + direction + CATEGORY_OPTIONS.length) % CATEGORY_OPTIONS.length;
      const nextCategory = CATEGORY_OPTIONS[nextIndex];
      setActiveCategory(nextCategory.id);
      tabRefs.current[nextIndex]?.focus();
    } else if (key === 'Home') {
      event.preventDefault();
      setActiveCategory(CATEGORY_OPTIONS[0].id);
      tabRefs.current[0]?.focus();
    } else if (key === 'End') {
      event.preventDefault();
      const lastIndex = CATEGORY_OPTIONS.length - 1;
      setActiveCategory(CATEGORY_OPTIONS[lastIndex].id);
      tabRefs.current[lastIndex]?.focus();
    }
  };

  return (
    <div id="marketplacePage" className={`page${isOpen ? '' : ' hidden'}`}>
      <h2>Marketplace</h2>
      <a
        href="#"
        id="skipToEditor"
        className="btn"
        style={{ margin: '16px 0', display: 'inline-block' }}
        onClick={(e) => { e.preventDefault(); onSkipToEditor?.(); }}
      >
        Skip to blank editor
      </a>
      <div className="marketplace-layout">
        <aside className="category-sidebar">
          <input type="text" id="designSearch" placeholder="Search designs" />
          <ul
            id="categoryTabs"
            className="category-tabs"
            role="tablist"
            aria-orientation="vertical"
          >
            {CATEGORY_OPTIONS.map((category, index) => {
              const isActive = activeCategory === category.id;
              return (
                <li key={category.id || 'all'}>
                  <button
                    ref={(element) => { tabRefs.current[index] = element; }}
                    type="button"
                    className={`category-tab${isActive ? ' active' : ''}`}
                    data-category={category.id}
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveCategory(category.id)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                  >
                    {category.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <div id="designGrid" className="marketplace-grid"></div>
      </div>
    </div>
  );
}
