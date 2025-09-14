import React, { useMemo, useCallback } from 'react';
import { useEditor } from '../context/EditorContext.jsx';
import TextLayer from './TextLayer.jsx';
import ImageLayer from './ImageLayer.jsx';

export default function Canvas() {
  const [state, dispatch] = useEditor();
  const { slides, selected, viewport } = state;

  const slide = useMemo(() => {
    const id = selected.slideId ?? slides[0]?.id;
    return slides.find((s) => s.id === id) || null;
  }, [slides, selected.slideId]);

  const onSelectElement = useCallback((e) => {
    const id = e.target?.dataset?.elementId;
    if (id) dispatch({ type: 'SELECT_ELEMENT', elementId: id });
  }, [dispatch]);

  const style = useMemo(() => ({
    position: 'relative',
    width: viewport.width * viewport.scale,
    height: viewport.height * viewport.scale,
    transformOrigin: 'top left',
    background: '#fff',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
  }), [viewport]);

  if (!slide) return <div style={{ flex: 1 }} />;

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={style} onClick={onSelectElement}>
        {slide.elements.map((el) => {
          if (el.type === 'text') return <TextLayer key={el.id} element={el} />;
          if (el.type === 'image') return <ImageLayer key={el.id} element={el} />;
          return null;
        })}
      </div>
    </div>
  );
}

