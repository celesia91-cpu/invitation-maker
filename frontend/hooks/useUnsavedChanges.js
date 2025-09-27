import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

// Hook for detecting and managing unsaved changes
export function useUnsavedChanges(options = {}) {
  const {
    trackSlideChanges = true,
    trackImageChanges = true,
    debounceMs = 500,
    autoSave = false,
    autoSaveInterval = 30000, // 30 seconds
  } = options;

  const { slides, imgState } = useAppState();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Track original state for comparison
  const originalStateRef = useRef(null);
  const changeTimeoutRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);

  // Initialize original state
  useEffect(() => {
    if (!originalStateRef.current) {
      originalStateRef.current = {
        slides: JSON.parse(JSON.stringify(slides)),
        imgState: { ...imgState },
        timestamp: Date.now(),
      };
    }
  }, [slides, imgState]);

  // Detect changes with debouncing
  useEffect(() => {
    if (!originalStateRef.current) return;

    const checkChanges = () => {
      let hasChanges = false;

      if (trackSlideChanges) {
        const currentSlidesStr = JSON.stringify(slides);
        const originalSlidesStr = JSON.stringify(originalStateRef.current.slides);
        if (currentSlidesStr !== originalSlidesStr) {
          hasChanges = true;
        }
      }

      if (trackImageChanges && !hasChanges) {
        const currentImgStr = JSON.stringify(imgState);
        const originalImgStr = JSON.stringify(originalStateRef.current.imgState);
        if (currentImgStr !== originalImgStr) {
          hasChanges = true;
        }
      }

      setHasUnsavedChanges(hasChanges);
    };

    // Clear existing timeout
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    // Debounce change detection
    changeTimeoutRef.current = setTimeout(checkChanges, debounceMs);

    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, [slides, imgState, trackSlideChanges, trackImageChanges, debounceMs]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges) return;

    const performAutoSave = async () => {
      if (isSaving) return;

      try {
        setIsSaving(true);
        // This would call your save function
        await new Promise(resolve => setTimeout(resolve, 1000)); // Mock save

        // Update original state after successful save
        originalStateRef.current = {
          slides: JSON.parse(JSON.stringify(slides)),
          imgState: { ...imgState },
          timestamp: Date.now(),
        };

        setHasUnsavedChanges(false);
        setLastSaved(Date.now());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    };

    autoSaveIntervalRef.current = setInterval(performAutoSave, autoSaveInterval);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [autoSave, hasUnsavedChanges, autoSaveInterval, slides, imgState, isSaving]);

  // Manual save function
  const saveChanges = useCallback(async (saveFunction) => {
    if (isSaving || !hasUnsavedChanges) return { success: true };

    try {
      setIsSaving(true);

      let result = { success: true };
      if (typeof saveFunction === 'function') {
        result = await saveFunction({
          slides,
          imgState,
          hasChanges: hasUnsavedChanges,
        });
      }

      if (result.success !== false) {
        // Update original state after successful save
        originalStateRef.current = {
          slides: JSON.parse(JSON.stringify(slides)),
          imgState: { ...imgState },
          timestamp: Date.now(),
        };

        setHasUnsavedChanges(false);
        setLastSaved(Date.now());
      }

      return result;
    } catch (error) {
      console.error('Save failed:', error);
      return { success: false, error };
    } finally {
      setIsSaving(false);
    }
  }, [slides, imgState, hasUnsavedChanges, isSaving]);

  // Discard changes - reset to original state
  const discardChanges = useCallback(() => {
    if (originalStateRef.current) {
      // This would need to be handled by the parent component
      // as we can't directly modify the global state from here
      setHasUnsavedChanges(false);
      return originalStateRef.current;
    }
    return null;
  }, []);

  // Mark as saved (external save)
  const markAsSaved = useCallback(() => {
    originalStateRef.current = {
      slides: JSON.parse(JSON.stringify(slides)),
      imgState: { ...imgState },
      timestamp: Date.now(),
    };

    setHasUnsavedChanges(false);
    setLastSaved(Date.now());
  }, [slides, imgState]);

  // Force unsaved state (for testing or special cases)
  const forceUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isSaving,
    lastSaved,
    saveChanges,
    discardChanges,
    markAsSaved,
    forceUnsaved,
    originalState: originalStateRef.current,
  };
}

// Hook for unsaved changes warning dialog
export function useUnsavedChangesWarning() {
  const [isShowingWarning, setIsShowingWarning] = useState(false);
  const [warningContext, setWarningContext] = useState(null);

  const showWarning = useCallback((context) => {
    setWarningContext(context);
    setIsShowingWarning(true);
  }, []);

  const hideWarning = useCallback(() => {
    setIsShowingWarning(false);
    setWarningContext(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (warningContext?.onConfirm) {
      warningContext.onConfirm();
    }
    hideWarning();
  }, [warningContext, hideWarning]);

  const handleCancel = useCallback(() => {
    if (warningContext?.onCancel) {
      warningContext.onCancel();
    }
    hideWarning();
  }, [warningContext, hideWarning]);

  return {
    isShowingWarning,
    warningContext,
    showWarning,
    hideWarning,
    handleConfirm,
    handleCancel,
  };
}