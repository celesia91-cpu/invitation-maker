import React, { useCallback } from 'react';
import { useEditor } from '../context/EditorContext.jsx';

export default function Toolbar() {
  const [state, dispatch] = useEditor();
  const selectedElementId = state.selected.elementId;

  const addText = useCallback(() => {
    dispatch({ type: 'ADD_TEXT' });
  }, [dispatch]);

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL');
    if (!url) return;
    dispatch({ type: 'ADD_IMAGE', src: url });
  }, [dispatch]);

  const del = useCallback(() => {
    if (!selectedElementId) return;
    dispatch({ type: 'DELETE_ELEMENT', elementId: selectedElementId });
  }, [dispatch, selectedElementId]);

  return (
    <div style={{ height: 48, borderBottom: '1px solid #e5e7eb', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={addText}>Add Text</button>
      <button onClick={addImage}>Add Image</button>
      <div style={{ flex: 1 }} />
      <button disabled={!selectedElementId} onClick={del}>Delete</button>
    </div>
  );
}

