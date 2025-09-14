import { useRef } from 'react';
import { useHistoryReducer } from '../hooks/useHistoryReducer.js';

// React component equivalent of drag-handlers.js for simple draggable box
export default function DragHandler() {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const { state: position, set, undo, redo, canUndo, canRedo } = useHistoryReducer({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragging.current) return;
    set({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  return (
    <div className="drag-demo">
      <div
        className="draggable"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          width: 100,
          height: 100,
          background: 'lightblue',
          position: 'absolute',
          cursor: 'move',
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      />
      <div className="controls">
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
      </div>
    </div>
  );
}
