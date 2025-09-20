import React, { useCallback, useMemo } from 'react';
import { useEditor } from '../context/EditorContext.jsx';
import { useAppState } from '../context/AppStateContext.jsx';
import { resolveCapabilities, resolveRole } from '../utils/roleCapabilities.js';

export default function SlidesPanel({ roleCapabilities }) {
  const [state, dispatch] = useEditor();
  const { slides, selected } = state;
  const { userRole } = useAppState();

  const { canEdit } = useMemo(() => {
    const fallbackRole = resolveRole(userRole);
    if (roleCapabilities && typeof roleCapabilities === 'object') {
      return resolveCapabilities(roleCapabilities, fallbackRole);
    }
    return resolveCapabilities({ role: fallbackRole }, fallbackRole);
  }, [roleCapabilities, userRole]);

  const readOnly = !canEdit;
  const editLockTitle = readOnly
    ? 'Adding slides is limited to creator or admin roles.'
    : undefined;

  const onAdd = useCallback(() => {
    if (readOnly) return;
    dispatch({ type: 'ADD_SLIDE' });
  }, [dispatch, readOnly]);

  const onSelect = useCallback((slideId) => {
    dispatch({ type: 'SELECT_SLIDE', slideId });
  }, [dispatch]);

  return (
    <div style={{ width: 240, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong>Slides</strong>
        <button
          onClick={onAdd}
          style={{ padding: '4px 8px' }}
          disabled={readOnly}
          title={editLockTitle}
        >
          + Add
        </button>
      </div>
      <div style={{ overflowY: 'auto' }}>
        {slides.map((s, index) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: 10,
              border: 'none',
              borderTop: '1px solid #f3f4f6',
              background: selected.slideId === s.id ? '#eef2ff' : 'white',
              cursor: 'pointer',
            }}
          >
            {s.name || `Slide ${index + 1}`}
          </button>
        ))}
      </div>
    </div>
  );
}

