import React, { useCallback, useMemo, useRef } from 'react';
import { useEditor } from '../context/EditorContext.jsx';

export default function TextLayer({ element }) {
  const [, dispatch] = useEditor();
  const ref = useRef(null);

  const style = useMemo(() => ({
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation || 0}deg)`,
    color: element.style?.color,
    fontFamily: element.style?.fontFamily,
    fontSize: element.style?.fontSize,
    fontWeight: element.style?.fontWeight,
    textAlign: element.style?.textAlign,
    lineHeight: 1.2,
    outline: '1px dashed rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: element.style?.textAlign || 'center',
    cursor: 'text',
    userSelect: 'text',
    background: 'transparent',
    whiteSpace: 'pre-wrap',
  }), [element]);

  const onBlur = useCallback(() => {
    const next = ref.current?.innerText ?? '';
    if (next !== element.content) {
      dispatch({ type: 'UPDATE_TEXT', elementId: element.id, patch: { content: next } });
    }
  }, [dispatch, element.id, element.content]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      style={style}
      onBlur={onBlur}
      data-element-id={element.id}
    >
      {element.content}
    </div>
  );
}

