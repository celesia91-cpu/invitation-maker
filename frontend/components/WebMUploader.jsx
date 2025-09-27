import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

const ACCEPTED_TYPES = {
  'video/webm': '.webm',
  'video/mp4': '.mp4',
  'image/jpeg': '.jpg,.jpeg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 30; // 30 seconds

export default function WebMUploader({
  onUploadComplete,
  onUploadError,
  acceptedTypes = ACCEPTED_TYPES,
  maxFileSize = MAX_FILE_SIZE,
  maxDuration = MAX_VIDEO_DURATION,
  className = '',
  disabled = false,
}) {
  const {
    startFileUpload,
    setFileUploadProgress,
    completeFileUpload,
    failFileUpload,
    fileUpload,
  } = useAppState();

  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const isUploading = fileUpload?.status === 'uploading';
  const uploadProgress = fileUpload?.progress || 0;

  const validateFile = useCallback((file) => {
    const errors = [];

    // Check file type
    if (!acceptedTypes[file.type]) {
      errors.push(`File type ${file.type} is not supported`);
    }

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds limit of ${(maxFileSize / (1024 * 1024)).toFixed(1)}MB`);
    }

    return errors;
  }, [acceptedTypes, maxFileSize]);

  const validateVideoFile = useCallback((file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('video/')) {
        resolve([]);
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const errors = [];
        if (video.duration > maxDuration) {
          errors.push(`Video duration ${video.duration.toFixed(1)}s exceeds limit of ${maxDuration}s`);
        }

        URL.revokeObjectURL(video.src);
        resolve(errors);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Unable to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  }, [maxDuration]);

  const createPreviewUrl = useCallback((file) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    });

    return url;
  }, [previewUrl]);

  const uploadFile = useCallback(async (file) => {
    try {
      // Start upload
      startFileUpload(file.name);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Simulate file processing and upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', file.type);
      formData.append('size', file.size);

      // Mock upload with progress simulation
      const uploadPromise = new Promise((resolve, reject) => {
        const { signal } = abortControllerRef.current;

        if (signal.aborted) {
          reject(new Error('Upload cancelled'));
          return;
        }

        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
          if (signal.aborted) {
            clearInterval(interval);
            reject(new Error('Upload cancelled'));
            return;
          }

          progress += Math.random() * 15;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);

            // Simulate successful upload response
            setTimeout(() => {
              resolve({
                success: true,
                fileId: `file-${Date.now()}`,
                url: previewUrl,
                thumbnailUrl: previewUrl,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                duration: file.type.startsWith('video/') ? Math.random() * 30 : undefined,
              });
            }, 500);
          } else {
            setFileUploadProgress(progress);
          }
        }, 200);

        // Cleanup on signal abort
        signal.addEventListener('abort', () => {
          clearInterval(interval);
          reject(new Error('Upload cancelled'));
        });
      });

      const result = await uploadPromise;

      // Complete upload
      completeFileUpload({
        fileName: file.name,
        result,
      });

      onUploadComplete?.(result);

      return result;
    } catch (error) {
      // Handle upload failure
      failFileUpload({
        fileName: file.name,
        error: error.message,
      });

      onUploadError?.(error);
      throw error;
    }
  }, [startFileUpload, setFileUploadProgress, completeFileUpload, failFileUpload, onUploadComplete, onUploadError, previewUrl]);

  const handleFile = useCallback(async (file) => {
    if (!file || disabled || isUploading) return;

    try {
      // Basic validation
      const basicErrors = validateFile(file);
      if (basicErrors.length > 0) {
        throw new Error(basicErrors.join(', '));
      }

      // Video-specific validation
      const videoErrors = await validateVideoFile(file);
      if (videoErrors.length > 0) {
        throw new Error(videoErrors.join(', '));
      }

      // Create preview
      createPreviewUrl(file);

      // Upload file
      await uploadFile(file);

    } catch (error) {
      console.error('File handling error:', error);
      onUploadError?.(error);

      // Show user-friendly error message
      alert(`Upload failed: ${error.message}`);
    }
  }, [disabled, isUploading, validateFile, validateVideoFile, createPreviewUrl, uploadFile, onUploadError]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]); // Handle first file only
    }
  }, [disabled, isUploading, handleFile]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || isUploading) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [disabled, isUploading]);

  const handleInputChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    failFileUpload({
      fileName: fileInfo?.name || 'Unknown',
      error: 'Upload cancelled by user',
    });
  }, [failFileUpload, fileInfo]);

  const clearPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFileInfo(null);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [previewUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [previewUrl]);

  const acceptedExtensions = Object.values(acceptedTypes).join(',');

  return (
    <div className={`webm-uploader ${className} ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''} ${disabled ? 'disabled' : ''}`}>
      <div
        className="upload-area"
        onDrop={handleDrop}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedExtensions}
          onChange={handleInputChange}
          disabled={disabled || isUploading}
          style={{ display: 'none' }}
        />

        {isUploading ? (
          <div className="upload-progress">
            <div className="upload-icon">📤</div>
            <div className="progress-info">
              <p>Uploading {fileInfo?.name}...</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <div className="progress-text">{Math.round(uploadProgress)}%</div>
            </div>
            <button
              type="button"
              className="cancel-btn"
              onClick={handleCancel}
              title="Cancel upload"
            >
              ×
            </button>
          </div>
        ) : previewUrl && fileInfo ? (
          <div className="file-preview">
            <div className="preview-media">
              {fileInfo.type.startsWith('video/') ? (
                <video
                  src={previewUrl}
                  controls
                  muted
                  style={{ maxWidth: '100%', maxHeight: '200px' }}
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                />
              )}
            </div>
            <div className="file-info">
              <p className="file-name">{fileInfo.name}</p>
              <p className="file-details">
                {(fileInfo.size / (1024 * 1024)).toFixed(1)} MB • {fileInfo.type}
              </p>
            </div>
            <button
              type="button"
              className="clear-btn"
              onClick={clearPreview}
              title="Remove file"
            >
              🗑️
            </button>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">
              {dragActive ? '⬇️' : '📁'}
            </div>
            <div className="upload-text">
              <p className="primary-text">
                {dragActive ? 'Drop file here' : 'Drop files here or click to browse'}
              </p>
              <p className="secondary-text">
                Supports WebM, MP4, PNG, JPG, GIF up to {(maxFileSize / (1024 * 1024))}MB
              </p>
              <p className="hint-text">
                Videos must be under {maxDuration} seconds
              </p>
            </div>
          </div>
        )}
      </div>

      {fileUpload?.status === 'success' && fileUpload.lastUpload && (
        <div className="upload-success">
          <span className="success-icon">✅</span>
          <span>Upload complete: {fileUpload.lastUpload.fileName}</span>
        </div>
      )}

      {fileUpload?.status === 'error' && fileUpload.error && (
        <div className="upload-error">
          <span className="error-icon">❌</span>
          <span>Upload failed: {fileUpload.error}</span>
        </div>
      )}
    </div>
  );
}