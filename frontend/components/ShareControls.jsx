import { useState } from 'react';

export default function ShareControls() {
  const [link, setLink] = useState('');

  return (
    <div className="share-controls" style={{ display: 'flex', gap: 8 }}>
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Share link" style={{ flex: 1 }} />
      <button className="btn" onClick={() => navigator.clipboard?.writeText(link)}>Copy</button>
    </div>
  );
}

