export default function Marketplace({ isOpen, onSkipToEditor }) {
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
          <ul id="categoryTabs" className="category-tabs">
            <li data-category="" className="active">All</li>
            <li data-category="popular">Popular</li>
            <li data-category="recent">Recently Added</li>
            <li data-category="favorites">Favorites</li>
            <li data-category="recently-viewed">Recently Viewed</li>
            <li data-category="Birthday">Birthday</li>
            <li data-category="Wedding">Wedding</li>
          </ul>
        </aside>
        <div id="designGrid" className="marketplace-grid"></div>
      </div>
    </div>
  );
}
