import React, { useMemo } from 'react';
import { EditorProvider } from '../context/EditorContext.jsx';
import SlidesPanel from './SlidesPanel.jsx';
import Toolbar from './Toolbar.jsx';
import Canvas from './Canvas.jsx';
import { useAppState } from '../context/AppStateContext.jsx';
import { resolveCapabilities } from '../utils/roleCapabilities.js';

export default function EditorShell({ initial }) {
  const { userRole } = useAppState();
  const roleCapabilities = useMemo(
    () => resolveCapabilities({ role: userRole }, userRole),
    [userRole]
  );

  return (
    <EditorProvider initial={initial}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh' }}>
        <Toolbar roleCapabilities={roleCapabilities} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <SlidesPanel roleCapabilities={roleCapabilities} />
          <Canvas />
        </div>
      </div>
    </EditorProvider>
  );
}

