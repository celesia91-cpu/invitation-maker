import React, { useCallback, useMemo } from 'react';
import { useEditor } from '../context/EditorContext.jsx';
import { useAppState } from '../context/AppStateContext.jsx';
import { resolveCapabilities, resolveRole } from '../utils/roleCapabilities.js';

export default function Toolbar({ roleCapabilities }) {
  const [state, dispatch] = useEditor();
  const selectedElementId = state.selected.elementId;
  const { userRole } = useAppState();

  const { canEdit, role: resolvedRole } = useMemo(() => {
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

  const addText = useCallback(() => {
    if (readOnly) return;
    dispatch({ type: 'ADD_TEXT' });
  }, [dispatch, readOnly]);

  const addImage = useCallback(() => {
    if (readOnly) return;
    const url = window.prompt('Image URL');
    if (!url) return;
    dispatch({ type: 'ADD_IMAGE', src: url });
  }, [dispatch, readOnly]);

  const del = useCallback(() => {
    if (readOnly || !selectedElementId) return;
    dispatch({ type: 'DELETE_ELEMENT', elementId: selectedElementId });
  }, [dispatch, readOnly, selectedElementId]);

  return (
    <div
      style={{
        height: 48,
        borderBottom: '1px solid #e5e7eb',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <button onClick={addText} disabled={readOnly} title={editLockTitle} data-role={resolvedRole}>
        Add Text
      </button>
      <button onClick={addImage} disabled={readOnly} title={editLockTitle} data-role={resolvedRole}>
        Add Image
      </button>
      <div style={{ flex: 1 }} />
      <button
        disabled={!selectedElementId || readOnly}
        onClick={del}
        title={editLockTitle}
        data-role={resolvedRole}
      >
        Delete
      </button>
    </div>
  );
}
