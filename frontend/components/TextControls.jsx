import { useAppState } from '../context/AppStateContext.jsx';

export default function TextControls() {
  const { activeIndex, slides, addTextLayer, updateTextLayer, removeTextLayer } = useAppState();
  const layers = slides[activeIndex]?.layers ?? [];

  return (
    <div className="text-controls">
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="addText" type="text" placeholder="Type text" />
        <button className="btn" onClick={() => {
          const inp = document.getElementById('addText');
          const text = inp?.value || 'Text';
          addTextLayer(text);
          if (inp) inp.value = '';
        }}>+ Add</button>
      </div>

      <div style={{ marginTop: 12 }}>
        {layers.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ minWidth: 80, fontSize: 12, color: '#94a3b8' }}>Layer {i + 1}</span>
            <input
              type="text"
              value={l.text}
              onChange={(e) => updateTextLayer(i, { text: e.target.value })}
              style={{ flex: 1 }}
            />
            <button className="btn" onClick={() => removeTextLayer(i)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

