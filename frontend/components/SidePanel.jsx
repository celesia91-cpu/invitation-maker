import { useMemo, useState } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';
import { resolveCapabilities, resolveRole } from '../utils/roleCapabilities.js';

function PanelGroup({ name, label, collapsed, onToggle, children, sectionProps = {} }) {
  const isCollapsed = !!collapsed;
  const contentId = `${name}-content`;
  const buttonId = `${name}-toggle`;
  const collapsedDataAttr = isCollapsed ? true : undefined;
  const { className: extraClassName, ...restSectionProps } = sectionProps;
  const baseClass = `group${isCollapsed ? ' collapsed' : ''}`;
  const sectionClassName = extraClassName ? `${baseClass} ${extraClassName}` : baseClass;

  return (
    <section
      {...restSectionProps}
      className={sectionClassName}
      data-group={name}
      aria-label={label}
      data-collapsed={collapsedDataAttr}
    >
      <button
        type="button"
        id={buttonId}
        className="group-title"
        onClick={() => onToggle(name)}
        aria-expanded={!isCollapsed}
        aria-controls={contentId}
      >
        <span>{label}</span>
        <span className="chevron" aria-hidden="true">
          <svg viewBox="0 0 12 12" width="12" height="12" focusable="false">
            <path
              d="M3 4.5 6 7.5 9 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div
        className="group-content"
        id={contentId}
        role="region"
        aria-hidden={isCollapsed}
        aria-labelledby={buttonId}
      >
        {children}
      </div>
    </section>
  );
}

export default function SidePanel({ roleCapabilities }) {
  const { userRole } = useAppState();
  const { role: resolvedRole, canEdit } = useMemo(() => {
    const fallbackRole = resolveRole(userRole);
    if (roleCapabilities && typeof roleCapabilities === 'object') {
      return resolveCapabilities(roleCapabilities, fallbackRole);
    }
    return resolveCapabilities({ role: fallbackRole }, fallbackRole);
  }, [roleCapabilities, userRole]);

  const readOnly = !canEdit;
  const editLockTitle = readOnly
    ? 'Editing controls are limited to creator or admin roles.'
    : undefined;

  const [collapsedGroups, setCollapsedGroups] = useState({
    slides: false,
    text: false,
    image: false,
    presets: false,
    event: false
  });

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <aside
      className="sidepanel"
      id="sidepanel"
      aria-label="Design panel"
      data-editor-role={resolvedRole}
      data-editor-readonly={readOnly || undefined}
    >
      <div className="panel-body">
        {readOnly && (
          <div
            className="role-indicator"
            role="note"
            aria-live="polite"
            style={{
              margin: '0 0 12px',
              padding: '8px 12px',
              background: 'rgba(148, 163, 184, 0.15)',
              borderRadius: 8,
              fontSize: 12,
              color: '#475569',
            }}
          >
            Editing is disabled for the “{resolvedRole}” role.
          </div>
        )}

        {/* Slides */}
        <PanelGroup
          name="slides"
          label="Slides"
          collapsed={collapsedGroups.slides}
          onToggle={toggleGroup}
        >
          <div className="row">
            <label>All slides</label>
            <div id="slidesStrip" className="slides-strip" role="tablist" aria-label="Slides"></div>
          </div>
          <div className="row">
            <label>Actions</label>
            <div>
              <button
                id="addSlideBtn"
                className="btn"
                type="button"
                disabled={readOnly}
                title={editLockTitle}
              >
                Add
              </button>
              <button
                id="dupSlideBtn"
                className="btn"
                type="button"
                disabled={readOnly}
                title={editLockTitle}
              >
                Duplicate
              </button>
              <button
                id="delSlideBtn"
                className="btn"
                type="button"
                disabled={readOnly}
                title={editLockTitle}
              >
                Delete
              </button>
            </div>
          </div>
          <div className="row">
            <label htmlFor="slideDur">
              Duration <small id="slideDurVal">3.0s</small>
            </label>
            <input
              id="slideDur"
              type="range"
              min="1000"
              max="10000"
              step="500"
              defaultValue="3000"
              disabled={readOnly}
              title={editLockTitle}
            />
          </div>
        </PanelGroup>

        {/* Text */}
        <PanelGroup
          name="text"
          label="Text"
          collapsed={collapsedGroups.text}
          onToggle={toggleGroup}
        >
          <div className="row">
            <label htmlFor="addText">Add Text</label>
            <div>
              <input
                id="addText"
                type="text"
                placeholder="Type and press +"
                disabled={readOnly}
                title={editLockTitle}
              />
              <button
                id="addTextBtn"
                className="btn"
                disabled={readOnly}
                title={editLockTitle}
              >
                +
              </button>
            </div>
          </div>
          <div className="row">
            <label>Selected</label>
            <div>
              <button id="textDelete" className="btn" type="button" disabled title={editLockTitle}>
                Delete
              </button>
              <button
                id="textAlignLeft"
                className="btn"
                type="button"
                disabled={readOnly}
                title={editLockTitle}
              >
                Left
              </button>
              <button
                id="textAlignCenter"
                className="btn"
                type="button"
                disabled={readOnly}
                title={editLockTitle}
              >
                Center
              </button>
              <button
                id="textAlignRight"
                className="btn"
                type="button"
                disabled={readOnly}
                title={editLockTitle}
              >
                Right
              </button>
            </div>
          </div>
          <div className="row">
            <label htmlFor="fontSize">Font Size</label>
            <input
              id="fontSize"
              type="range"
              min="8"
              max="120"
              defaultValue="24"
              disabled={readOnly}
              title={editLockTitle}
            />
          </div>
          <div className="row">
            <label htmlFor="fontFamily">Font</label>
            <select id="fontFamily" defaultValue="system-ui" disabled={readOnly} title={editLockTitle}>
              <option value="system-ui">System</option>
              <option value="'Monaco, Consolas, \'Courier New\', monospace'">Monaco</option>
              <option value="'Pacifico', cursive">Pacifico</option>
              <option value="'Dancing Script', cursive">Dancing Script</option>
              <option value="'Shadows Into Light', cursive">Shadows Into Light</option>
            </select>
          </div>
          <div className="row text-style-btns">
            <button id="boldBtn" title="Bold" disabled={readOnly} aria-disabled={readOnly}>
              B
            </button>
            <button id="italicBtn" title="Italic" disabled={readOnly} aria-disabled={readOnly}>
              <i>I</i>
            </button>
            <button id="underlineBtn" title="Underline" disabled={readOnly} aria-disabled={readOnly}>
              <u>U</u>
            </button>
          </div>
        </PanelGroup>

        {/* Image */}
        <PanelGroup
          name="image"
          label="Image"
          collapsed={collapsedGroups.image}
          onToggle={toggleGroup}
        >
          <div className="row">
            <label htmlFor="imgScale">
              Scale <small id="imgScaleVal" aria-live="polite">100%</small>
            </label>
            <input
              id="imgScale"
              type="range"
              min="10"
              max="300"
              defaultValue="100"
              disabled={readOnly}
              title={editLockTitle}
            />
          </div>
          <div className="row">
            <label htmlFor="imgRotate">
              Rotate <small id="imgRotateVal" aria-live="polite">0°</small>
            </label>
            <input
              id="imgRotate"
              type="range"
              min="-180"
              max="180"
              step="1"
              defaultValue="0"
              disabled={readOnly}
              title={editLockTitle}
            />
          </div>
          <div className="row">
            <label>Actions</label>
            <div>
              <button
                id="imgFlip"
                className="btn"
                type="button"
                disabled={readOnly}
                title={editLockTitle}
              >
                Flip
              </button>
              <button
                id="imgDelete"
                className="btn"
                type="button"
                disabled={readOnly}
                title={editLockTitle}
              >
                Delete
              </button>
            </div>
          </div>

          <div className="row">
            <label>Fade In</label>
            <div>
              <button
                id="imgFadeInBtn"
                className="btn toggle"
                type="button"
                disabled={readOnly}
                title={editLockTitle}
              >
                Fade In
              </button>
              <input
                id="imgFadeInRange"
                type="range"
                min="0"
                max="5000"
                step="100"
                defaultValue="0"
                disabled={readOnly}
                title={editLockTitle}
              />
              <span id="imgFadeInVal" className="pill">0.0s</span>
            </div>
          </div>
          <div className="row">
            <label>Fade Out</label>
            <div>
              <button
                id="imgFadeOutBtn"
                className="btn toggle"
                type="button"
                disabled={readOnly}
                title={editLockTitle}
              >
                Fade Out
              </button>
              <input
                id="imgFadeOutRange"
                type="range"
                min="0"
                max="5000"
                step="100"
                defaultValue="0"
                disabled={readOnly}
                title={editLockTitle}
              />
              <span id="imgFadeOutVal" className="pill">0.0s</span>
            </div>
          </div>
        </PanelGroup>

        {/* Presets */}
        <PanelGroup
          name="presets"
          label="Presets"
          collapsed={collapsedGroups.presets}
          onToggle={toggleGroup}
        >
          <div className="row">
            <label>Choose</label>
            <div className="preset-grid" id="presetGrid" role="group" aria-label="Image filter presets">
              <button
                className="preset-btn"
                data-preset="none"
                aria-pressed="true"
                disabled={readOnly}
                aria-disabled={readOnly}
                title={editLockTitle}
              >
                <span className="preset-icon" aria-hidden="true"></span>
                <span className="preset-label">None</span>
              </button>
              <button
                className="preset-btn"
                data-preset="warm"
                aria-pressed="false"
                disabled={readOnly}
                aria-disabled={readOnly}
                title={editLockTitle}
              >
                <span className="preset-icon" aria-hidden="true"></span>
                <span className="preset-label">Warm</span>
              </button>
              <button
                className="preset-btn"
                data-preset="cool"
                aria-pressed="false"
                disabled={readOnly}
                aria-disabled={readOnly}
                title={editLockTitle}
              >
                <span className="preset-icon" aria-hidden="true"></span>
                <span className="preset-label">Cool</span>
              </button>
              <button
                className="preset-btn"
                data-preset="mono"
                aria-pressed="false"
                disabled={readOnly}
                aria-disabled={readOnly}
                title={editLockTitle}
              >
                <span className="preset-icon" aria-hidden="true"></span>
                <span className="preset-label">Mono</span>
              </button>
              <button
                className="preset-btn"
                data-preset="vintage"
                aria-pressed="false"
                disabled={readOnly}
                aria-disabled={readOnly}
                title={editLockTitle}
              >
                <span className="preset-icon" aria-hidden="true"></span>
                <span className="preset-label">Vintage</span>
              </button>
              <button
                className="preset-btn"
                data-preset="dramatic"
                aria-pressed="false"
                disabled={readOnly}
                aria-disabled={readOnly}
                title={editLockTitle}
              >
                <span className="preset-icon" aria-hidden="true"></span>
                <span className="preset-label">Dramatic</span>
              </button>
            </div>
          </div>
        </PanelGroup>

        {/* Event */}
        <PanelGroup
          name="event"
          label="Event"
          collapsed={collapsedGroups.event}
          onToggle={toggleGroup}
          sectionProps={{ id: 'mapGroup' }}
        >
          <div className="row">
            <label htmlFor="mapInput">Venue / Map</label>
            <div>
              <input
                id="mapInput"
                type="text"
                placeholder="e.g., 123 Main St, Toronto"
                disabled={readOnly}
                title={editLockTitle}
              />
              <div>
                <button
                  id="mapOpenBtn"
                  className="btn"
                  disabled={readOnly}
                  title={editLockTitle}
                >
                  Open
                </button>
                <button
                  id="mapCopyBtn"
                  className="btn"
                  disabled={readOnly}
                  title={editLockTitle}
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
          <p className="hint" style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 12 }}>
            Set the place guests should see when they tap &quot;View Map&quot;.
          </p>
        </PanelGroup>
      </div>
    </aside>
  );
}

