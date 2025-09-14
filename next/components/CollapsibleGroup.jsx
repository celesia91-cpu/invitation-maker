import { useHistoryReducer } from '../hooks/useHistoryReducer.js';

// React component equivalent of collapsible-groups.js
export default function CollapsibleGroup({ title, children }) {
  const { state: isOpen, set, undo, redo, canUndo, canRedo } = useHistoryReducer(true);

  return (
    <div className="collapsible-group">
      <button onClick={() => set(!isOpen)}>{isOpen ? 'Hide' : 'Show'} {title}</button>
      {isOpen && <div className="content">{children}</div>}
      <div className="controls">
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
      </div>
    </div>
  );
}
