import React, { useMemo } from 'react';
import { EditorProvider } from '../context/EditorContext.jsx';
import SlidesPanel from './SlidesPanel.jsx';
import Toolbar from './Toolbar.jsx';
import Canvas from './Canvas.jsx';
import FeatureErrorBoundary from './FeatureErrorBoundary.jsx';
import { useAppState } from '../context/AppStateContext.jsx';
import { resolveCapabilities } from '../utils/roleCapabilities.js';

export default function EditorShell({ initial }) {
  const { userRole } = useAppState();
  const roleCapabilities = useMemo(
    () => resolveCapabilities({ role: userRole }, userRole),
    [userRole]
  );

  return (
    <FeatureErrorBoundary
      featureName="Editor"
      fallbackMessage="The design editor is temporarily unavailable. Please try refreshing the page."
      showReload={true}
    >
      <EditorProvider initial={initial}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh' }}>
          <FeatureErrorBoundary featureName="Toolbar" fallbackMessage="The toolbar is unavailable.">
            <Toolbar roleCapabilities={roleCapabilities} />
          </FeatureErrorBoundary>
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <FeatureErrorBoundary featureName="Slides Panel" fallbackMessage="The slides panel is unavailable.">
              <SlidesPanel roleCapabilities={roleCapabilities} />
            </FeatureErrorBoundary>
            <FeatureErrorBoundary featureName="Canvas" fallbackMessage="The canvas is unavailable.">
              <Canvas />
            </FeatureErrorBoundary>
          </div>
        </div>
      </EditorProvider>
    </FeatureErrorBoundary>
  );
}

