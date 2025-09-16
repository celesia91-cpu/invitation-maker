import { useState } from 'react';

export default function SidePanel() {
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
    <aside className="sidepanel" id="sidepanel" aria-label="Design panel">
      <div className="panel-body">
        {/* Slides */}
        <section className={`group ${collapsedGroups.slides ? 'collapsed' : ''}`} data-group="slides" aria-label="Slides">
          <div className="group-title" onClick={() => toggleGroup('slides')}>
            Slides
            <span className="chevron">▼</span>
          </div>
          <div className="group-content">
            <div className="row">
              <label>All slides</label>
              <div id="slidesStrip" className="slides-strip" role="tablist" aria-label="Slides"></div>
            </div>
            <div className="row">
              <label>Actions</label>
              <div>
                <button id="addSlideBtn" className="btn" type="button">Add</button>
                <button id="dupSlideBtn" className="btn" type="button">Duplicate</button>
                <button id="delSlideBtn" className="btn" type="button">Delete</button>
              </div>
            </div>
            <div className="row">
              <label htmlFor="slideDur">
                Duration <small id="slideDurVal">3.0s</small>
              </label>
              <input id="slideDur" type="range" min="1000" max="10000" step="500" defaultValue="3000" />
            </div>
          </div>
        </section>

        {/* Text */}
        <section className={`group ${collapsedGroups.text ? 'collapsed' : ''}`} data-group="text" aria-label="Text">
          <div className="group-title" onClick={() => toggleGroup('text')}>
            Text
            <span className="chevron">▼</span>
          </div>
          <div className="group-content">
            <div className="row">
              <label htmlFor="addText">Add Text</label>
              <div>
                <input id="addText" type="text" placeholder="Type and press +" />
                <button id="addTextBtn" className="btn">+</button>
              </div>
            </div>
            <div className="row">
              <label>Selected</label>
              <div>
                <button id="textDelete" className="btn" type="button" disabled>
                  Delete
                </button>
                <button id="textAlignLeft" className="btn" type="button">Left</button>
                <button id="textAlignCenter" className="btn" type="button">Center</button>
                <button id="textAlignRight" className="btn" type="button">Right</button>
              </div>
            </div>
            <div className="row">
              <label htmlFor="fontSize">Font Size</label>
              <input id="fontSize" type="range" min="8" max="120" defaultValue="24" />
            </div>
            <div className="row">
              <label htmlFor="fontFamily">Font</label>
              <select id="fontFamily" defaultValue="system-ui">
                <option value="system-ui">System</option>
                <option value="'Monaco, Consolas, \'Courier New\', monospace'">Monaco</option>
                <option value="'Pacifico', cursive">Pacifico</option>
                <option value="'Dancing Script', cursive">Dancing Script</option>
                <option value="'Shadows Into Light', cursive">Shadows Into Light</option>
              </select>
            </div>
            <div className="row text-style-btns">
              <button id="boldBtn" title="Bold">B</button>
              <button id="italicBtn" title="Italic"><i>I</i></button>
              <button id="underlineBtn" title="Underline"><u>U</u></button>
            </div>
          </div>
        </section>

        {/* Image */}
        <section className={`group ${collapsedGroups.image ? 'collapsed' : ''}`} data-group="image" aria-label="Image">
          <div className="group-title" onClick={() => toggleGroup('image')}>
            Image
            <span className="chevron">▼</span>
          </div>
          <div className="group-content">
            <div className="row">
              <label htmlFor="imgScale">
                Scale <small id="imgScaleVal" aria-live="polite">100%</small>
              </label>
              <input id="imgScale" type="range" min="10" max="300" defaultValue="100" />
            </div>
            <div className="row">
              <label htmlFor="imgRotate">
                Rotate <small id="imgRotateVal" aria-live="polite">0°</small>
              </label>
              <input id="imgRotate" type="range" min="-180" max="180" step="1" defaultValue="0" />
            </div>
            <div className="row">
              <label>Actions</label>
              <div>
                <button id="imgFlip" className="btn" type="button">Flip</button>
                <button id="imgDelete" className="btn" type="button">Delete</button>
              </div>
            </div>

            <div className="row">
              <label>Fade In</label>
              <div>
                <button id="imgFadeInBtn" className="btn toggle" type="button">Fade In</button>
                <input id="imgFadeInRange" type="range" min="0" max="5000" step="100" defaultValue="0" />
                <span id="imgFadeInVal" className="pill">0.0s</span>
              </div>
            </div>
            <div className="row">
              <label>Fade Out</label>
              <div>
                <button id="imgFadeOutBtn" className="btn toggle" type="button">Fade Out</button>
                <input id="imgFadeOutRange" type="range" min="0" max="5000" step="100" defaultValue="0" />
                <span id="imgFadeOutVal" className="pill">0.0s</span>
              </div>
            </div>
          </div>
        </section>

        {/* Presets */}
        <section className={`group ${collapsedGroups.presets ? 'collapsed' : ''}`} data-group="presets" aria-label="Presets">
          <div className="group-title" onClick={() => toggleGroup('presets')}>
            Presets
            <span className="chevron">▼</span>
          </div>
          <div className="group-content">
            <div className="row">
              <label>Choose</label>
              <div className="preset-grid" id="presetGrid" role="group" aria-label="Image filter presets">
                <button className="preset-btn" data-preset="none" aria-pressed="true">
                  <span className="preset-icon" aria-hidden="true"></span>
                  <span className="preset-label">None</span>
                </button>
                <button className="preset-btn" data-preset="warm" aria-pressed="false">
                  <span className="preset-icon" aria-hidden="true"></span>
                  <span className="preset-label">Warm</span>
                </button>
                <button className="preset-btn" data-preset="cool" aria-pressed="false">
                  <span className="preset-icon" aria-hidden="true"></span>
                  <span className="preset-label">Cool</span>
                </button>
                <button className="preset-btn" data-preset="mono" aria-pressed="false">
                  <span className="preset-icon" aria-hidden="true"></span>
                  <span className="preset-label">Mono</span>
                </button>
                <button className="preset-btn" data-preset="vintage" aria-pressed="false">
                  <span className="preset-icon" aria-hidden="true"></span>
                  <span className="preset-label">Vintage</span>
                </button>
                <button className="preset-btn" data-preset="dramatic" aria-pressed="false">
                  <span className="preset-icon" aria-hidden="true"></span>
                  <span className="preset-label">Dramatic</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Event */}
        <section className={`group ${collapsedGroups.event ? 'collapsed' : ''}`} data-group="event" aria-label="Event" id="mapGroup">
          <div className="group-title" onClick={() => toggleGroup('event')}>
            Event
            <span className="chevron">▼</span>
          </div>
          <div className="group-content">
            <div className="row">
              <label htmlFor="mapInput">Venue / Map</label>
              <div>
                <input id="mapInput" type="text" placeholder="e.g., 123 Main St, Toronto" />
                <div>
                  <button id="mapOpenBtn" className="btn">Open</button>
                  <button id="mapCopyBtn" className="btn">Copy Link</button>
                </div>
              </div>
            </div>
            <p className="hint" style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 12 }}>
              Set the place guests should see when they tap "View Map".
            </p>
          </div>
        </section>
      </div>
    </aside>
  );
}

