import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';
import { resolveCapabilities, resolveRole } from '../utils/roleCapabilities.js';
import useFileUpload from '../hooks/useFileUpload.js';

export default function UploadBackgroundButton({ api, roleCapabilities }) {
  const inputRef = useRef(null);
  const {
    status,
    progress,
    error,
    lastUpload,
    isUploading,
    handleInputChange,
  } = useFileUpload({ api });
  const { userRole } = useAppState();

  const { role: resolvedRole, canEdit } = useMemo(() => {
    const fallbackRole = resolveRole(userRole);
    if (roleCapabilities && typeof roleCapabilities === 'object') {
      return resolveCapabilities(roleCapabilities, fallbackRole);
    }
    return resolveCapabilities({ role: fallbackRole }, fallbackRole);
  }, [roleCapabilities, userRole]);

  const buttonLabel = isUploading
    ? `Uploading… ${Math.round(progress)}%`
    : 'Upload Background';
  const readOnly = !canEdit;
  const disabled = isUploading || !api || typeof api.uploadImage !== 'function' || readOnly;
  const editLockTitle = readOnly
    ? 'Uploading backgrounds is limited to creator or admin roles.'
    : undefined;

  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (status === 'error' && error) {
      const message = error?.message || String(error);
      setLocalError(message);
    } else if (status === 'uploading') {
      setLocalError(null);
    }
  }, [status, error]);

  const progressValue = useMemo(() => Math.round(progress), [progress]);
  const showProgress = isUploading;
  const showSuccess = status === 'success' && lastUpload?.fileName;
  const errorMessage = localError || (error && (error.message || String(error))) || null;
  const showError = Boolean(errorMessage);

  return (
    <>
      <input
        ref={inputRef}
        id="bgFileInput"
        type="file"
        accept="image/*"
        aria-label="Upload background image"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      <button
        id="uploadBgBtn"
        type="button"
        className="btn"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title={editLockTitle}
        data-role={resolvedRole}
      >
        {buttonLabel}
      </button>
      {readOnly && !isUploading && (
        <p
          role="note"
          style={{
            margin: '8px 0 0',
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          Uploads are disabled for the “{resolvedRole}” role.
        </p>
      )}
      {(showProgress || showSuccess || showError) && (
        <div
          className="upload-feedback"
          aria-live="polite"
          style={{ marginTop: 8, fontSize: 12 }}
        >
          {showProgress && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <progress
                value={progress}
                max={100}
                aria-label="Upload progress"
                style={{ width: 160 }}
              />
              <span>{progressValue}%</span>
            </div>
          )}
          {showSuccess && (
            <p
              role="status"
              style={{
                margin: '4px 0 0',
                color: 'var(--text-success, #16a34a)',
              }}
            >
              Uploaded {lastUpload.fileName}
            </p>
          )}
          {showError && (
            <p
              role="alert"
              style={{
                margin: '4px 0 0',
                color: 'var(--text-danger, #ef4444)',
              }}
            >
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </>
  );
}
