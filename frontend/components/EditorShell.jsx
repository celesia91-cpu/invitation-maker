import React from 'react';
import { EditorProvider } from '../context/EditorContext.jsx';
import SlidesPanel from './SlidesPanel.jsx';
import Toolbar from './Toolbar.jsx';
import Canvas from './Canvas.jsx';

export default function EditorShell({ initial }) {
  return (
    <EditorProvider initial={initial}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh' }}>
        <Toolbar />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <SlidesPanel />
          <Canvas />
        </div>
      </div>
    </EditorProvider>
  );
}

