import { useMemo, useRef } from 'react';
import useFileUpload from '../hooks/useFileUpload.js';

export default function UploadBackgroundButton({ api }) {
  const inputRef = useRef(null);
  const {
    status,
    progress,
    error,
    lastUpload,
    isUploading,
    handleInputChange,
  } = useFileUpload({ api });

  const buttonLabel = isUploading
    ? `Uploading… ${Math.round(progress)}%`
    : 'Upload Background';
  const disabled = isUploading || !api || typeof api.uploadImage !== 'function';

  const progressValue = useMemo(() => Math.round(progress), [progress]);
  const showProgress = isUploading;
  const showSuccess = status === 'success' && lastUpload?.fileName;
  const showError = status === 'error' && error;

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
      >
        {buttonLabel}
      </button>
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
              {error.message || String(error)}
            </p>
          )}
        </div>
      )}
    </>
  );
}
