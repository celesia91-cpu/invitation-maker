import { useCallback, useMemo, useState } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';
import { resolveCapabilities, resolveRole } from '../utils/roleCapabilities.js';
import MusicUploader from './MusicUploader.jsx';
import FeatureErrorBoundary from './FeatureErrorBoundary.jsx';

export default function UploadMusicButton({ api, roleCapabilities }) {
  const { userRole, updateMusicState } = useAppState();
  const [showUploader, setShowUploader] = useState(false);

  const { role: resolvedRole, canEdit } = useMemo(() => {
    const fallbackRole = resolveRole(userRole);
    if (roleCapabilities && typeof roleCapabilities === 'object') {
      return resolveCapabilities(roleCapabilities, fallbackRole);
    }
    return resolveCapabilities({ role: fallbackRole }, fallbackRole);
  }, [roleCapabilities, userRole]);

  const readOnly = !canEdit;
  const disabled = !api || readOnly;
  const editLockTitle = readOnly
    ? 'Uploading music is limited to creator or admin roles.'
    : undefined;

  const handleUploadComplete = useCallback((result) => {
    // Update music state with uploaded file
    if (result.url) {
      if (typeof updateMusicState === 'function') {
        updateMusicState({
          has: true,
          musicId: result.fileId,
          musicUrl: result.url,
          fileName: result.fileName,
          duration: result.duration,
        });
      } else {
        // Fallback: store in localStorage or use existing image state structure
        console.log('Music uploaded:', result);
        // You might want to extend the app state to handle music separately
      }
    }

    setShowUploader(false);
  }, [updateMusicState]);

  const handleUploadError = useCallback((error) => {
    console.error('Music upload error:', error);
    // Error handling is managed by the MusicUploader component
  }, []);

  return (
    <>
      <button
        id="uploadMusicBtn"
        type="button"
        className="btn"
        onClick={() => setShowUploader(true)}
        disabled={disabled}
        title={editLockTitle}
        data-role={resolvedRole}
      >
        🎵 Upload Music
      </button>

      {readOnly && (
        <p
          role="note"
          style={{
            margin: '8px 0 0',
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          Music uploads are disabled for the &quot;{resolvedRole}&quot; role.
        </p>
      )}

      {showUploader && (
        <div className="upload-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowUploader(false)}>
          <div className="upload-modal" role="dialog" aria-labelledby="upload-modal-title">
            <header className="upload-modal-header">
              <h3 id="upload-modal-title">Upload Background Music</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowUploader(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <div className="upload-modal-content">
              <FeatureErrorBoundary
                featureName="Music Uploader"
                fallbackMessage="The music uploader is temporarily unavailable. Please try closing and reopening the upload dialog."
              >
                <MusicUploader
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  disabled={disabled}
                  className="music-uploader"
                />
              </FeatureErrorBoundary>

              <div className="upload-tips">
                <h4>Supported Audio Formats:</h4>
                <ul>
                  <li>🎵 <strong>Audio:</strong> MP3, WAV, OGG, AAC, M4A, FLAC (max 5 min, 20MB)</li>
                </ul>
                <p className="tip">
                  💡 <strong>Tip:</strong> Background music will loop automatically in your design
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}