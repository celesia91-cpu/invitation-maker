import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

const ACCEPTED_AUDIO_TYPES = {
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/aac': '.aac',
  'audio/m4a': '.m4a',
  'audio/flac': '.flac',
};

const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_AUDIO_DURATION = 300; // 5 minutes

export default function MusicUploader({
  onUploadComplete,
  onUploadError,
  acceptedTypes = ACCEPTED_AUDIO_TYPES,
  maxFileSize = MAX_AUDIO_SIZE,
  maxDuration = MAX_AUDIO_DURATION,
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
  const [audioInfo, setAudioInfo] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const isUploading = fileUpload?.status === 'uploading';
  const uploadProgress = fileUpload?.progress || 0;

  const validateFile = useCallback((file) => {
    const errors = [];

    // Check file type
    if (!acceptedTypes[file.type]) {
      errors.push(`Audio format ${file.type} is not supported`);
    }

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds limit of ${(maxFileSize / (1024 * 1024)).toFixed(1)}MB`);
    }

    return errors;
  }, [acceptedTypes, maxFileSize]);

  const validateAudioFile = useCallback((file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('audio/')) {
        resolve([]);
        return;
      }

      const audio = new Audio();
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        const errors = [];
        if (audio.duration > maxDuration) {
          errors.push(`Audio duration ${Math.round(audio.duration)}s exceeds limit of ${maxDuration}s`);
        }

        URL.revokeObjectURL(audio.src);
        resolve(errors);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        reject(new Error('Unable to load audio metadata'));
      };

      audio.src = URL.createObjectURL(file);
    });
  }, [maxDuration]);

  const createAudioInfo = useCallback((file) => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    setAudioInfo({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    });

    return url;
  }, [audioUrl]);

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
                fileId: `audio-${Date.now()}`,
                url: audioUrl,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                duration: Math.random() * maxDuration,
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
  }, [startFileUpload, setFileUploadProgress, completeFileUpload, failFileUpload, onUploadComplete, onUploadError, audioUrl, maxDuration]);

  const handleFile = useCallback(async (file) => {
    if (!file || disabled || isUploading) return;

    try {
      // Basic validation
      const basicErrors = validateFile(file);
      if (basicErrors.length > 0) {
        throw new Error(basicErrors.join(', '));
      }

      // Audio-specific validation
      const audioErrors = await validateAudioFile(file);
      if (audioErrors.length > 0) {
        throw new Error(audioErrors.join(', '));
      }

      // Create audio info
      createAudioInfo(file);

      // Upload file
      await uploadFile(file);

    } catch (error) {
      console.error('Audio file handling error:', error);
      onUploadError?.(error);

      // Show user-friendly error message
      alert(`Music upload failed: ${error.message}`);
    }
  }, [disabled, isUploading, validateFile, validateAudioFile, createAudioInfo, uploadFile, onUploadError]);

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
      fileName: audioInfo?.name || 'Unknown',
      error: 'Upload cancelled by user',
    });
  }, [failFileUpload, audioInfo]);

  const clearAudio = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioInfo(null);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [audioUrl]);

  const acceptedExtensions = Object.values(acceptedTypes).join(',');

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`music-uploader ${className} ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''} ${disabled ? 'disabled' : ''}`}>
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
            <div className="upload-icon">🎵</div>
            <div className="progress-info">
              <p>Uploading {audioInfo?.name}...</p>
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
        ) : audioUrl && audioInfo ? (
          <div className="audio-preview">
            <div className="audio-controls">
              <audio
                src={audioUrl}
                controls
                style={{ width: '100%' }}
              />
            </div>
            <div className="file-info">
              <p className="file-name">🎵 {audioInfo.name}</p>
              <p className="file-details">
                {(audioInfo.size / (1024 * 1024)).toFixed(1)} MB • {audioInfo.type}
              </p>
            </div>
            <button
              type="button"
              className="clear-btn"
              onClick={clearAudio}
              title="Remove audio"
            >
              🗑️
            </button>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">
              {dragActive ? '⬇️' : '🎵'}
            </div>
            <div className="upload-text">
              <p className="primary-text">
                {dragActive ? 'Drop audio file here' : 'Drop music files here or click to browse'}
              </p>
              <p className="secondary-text">
                Supports MP3, WAV, OGG, AAC, M4A, FLAC up to {(maxFileSize / (1024 * 1024))}MB
              </p>
              <p className="hint-text">
                Audio must be under {Math.round(maxDuration / 60)} minutes
              </p>
            </div>
          </div>
        )}
      </div>

      {fileUpload?.status === 'success' && fileUpload.lastUpload && (
        <div className="upload-success">
          <span className="success-icon">✅</span>
          <span>Music upload complete: {fileUpload.lastUpload.fileName}</span>
        </div>
      )}

      {fileUpload?.status === 'error' && fileUpload.error && (
        <div className="upload-error">
          <span className="error-icon">❌</span>
          <span>Music upload failed: {fileUpload.error}</span>
        </div>
      )}
    </div>
  );
}