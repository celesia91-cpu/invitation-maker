import { useAppState } from '../context/AppStateContext.jsx';

export default function PlaybackControls() {
  const { playing, setPlaying } = useAppState();
  return (
    <div className="playback-controls" style={{ display: 'flex', gap: 8 }}>
      <button className="btn" onClick={() => setPlaying(false)}>Prev</button>
      <button className="btn" aria-pressed={playing} onClick={() => setPlaying(!playing)}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button className="btn" onClick={() => setPlaying(false)}>Next</button>
    </div>
  );
}

