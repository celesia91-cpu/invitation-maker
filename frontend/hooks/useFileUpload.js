import { useCallback } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

function normalizeUploadResult(response) {
  if (!response) {
    return null;
  }

  const image = response.image ?? response.asset ?? response;
  const id =
    image?.id ??
    image?.imageId ??
    response.imageId ??
    response.id ??
    null;
  const url =
    image?.url ??
    image?.imageUrl ??
    image?.fullUrl ??
    response.url ??
    response.imageUrl ??
    null;
  const thumbnailUrl =
    image?.thumbnailUrl ??
    image?.thumbnail ??
    image?.thumbUrl ??
    response.thumbnailUrl ??
    response.thumbnail ??
    null;
  const width =
    image?.width ??
    image?.naturalWidth ??
    image?.imageWidth ??
    response.width ??
    response.naturalWidth ??
    null;
  const height =
    image?.height ??
    image?.naturalHeight ??
    image?.imageHeight ??
    response.height ??
    response.naturalHeight ??
    null;

  return {
    id,
    url,
    thumbnailUrl,
    width,
    height,
    original: response,
  };
}

export default function useFileUpload({ api, onSuccess, onError } = {}) {
  const {
    fileUpload,
    workSize,
    startFileUpload,
    setFileUploadProgress,
    completeFileUpload,
    failFileUpload,
    updateImgState,
  } = useAppState();

  const applyImageToCanvas = useCallback(
    (payload) => {
      if (!payload) return;

      const width = payload.width ?? workSize?.w ?? 0;
      const height = payload.height ?? workSize?.h ?? 0;

      updateImgState({
        has: true,
        backendImageId: payload.id ?? null,
        backendImageUrl: payload.url ?? null,
        backendThumbnailUrl: payload.thumbnailUrl ?? null,
        natW: width ?? 0,
        natH: height ?? 0,
        cx: workSize?.w ? workSize.w / 2 : (width ?? 0) / 2,
        cy: workSize?.h ? workSize.h / 2 : (height ?? 0) / 2,
        scale: 1,
        angle: 0,
        shearX: 0,
        shearY: 0,
        signX: 1,
        signY: 1,
        flip: false,
      });
    },
    [updateImgState, workSize]
  );

  const uploadFile = useCallback(
    async (file) => {
      if (!file) return null;

      if (!api || typeof api.uploadImage !== 'function') {
        const error = new Error('Upload service unavailable');
        failFileUpload({ fileName: file.name ?? null, error });
        throw error;
      }

      startFileUpload({ fileName: file.name ?? null });
      setFileUploadProgress(5);

      try {
        const response = await api.uploadImage(file);
        setFileUploadProgress(90);
        const normalized = normalizeUploadResult(response);
        completeFileUpload({ fileName: file.name ?? null, result: normalized });
        if (normalized && (normalized.url || normalized.thumbnailUrl)) {
          applyImageToCanvas(normalized);
        }
        if (typeof onSuccess === 'function') {
          onSuccess(normalized);
        }
        return normalized;
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        failFileUpload({ fileName: file.name ?? null, error });
        if (typeof onError === 'function') {
          onError(error);
        }
        throw error;
      }
    },
    [
      api,
      applyImageToCanvas,
      completeFileUpload,
      failFileUpload,
      onError,
      onSuccess,
      setFileUploadProgress,
      startFileUpload,
    ]
  );

  const handleFiles = useCallback(
    async (files) => {
      if (!files || files.length === 0) return null;
      return uploadFile(files[0]);
    },
    [uploadFile]
  );

  const handleInputChange = useCallback(
    async (event) => {
      const input = event?.target ?? null;
      const files = input?.files;
      const file = files && files.length > 0 ? files[0] : null;
      if (!file) return;

      try {
        await uploadFile(file);
      } catch (_) {
        // state updates triggered within uploadFile handle the failure case
      } finally {
        if (input) {
          input.value = '';
        }
      }
    },
    [uploadFile]
  );

  const status = fileUpload?.status ?? 'idle';
  const progress = fileUpload?.progress ?? 0;
  const error = fileUpload?.error ?? null;
  const lastUpload = fileUpload?.lastUpload ?? null;
  const fileName = fileUpload?.fileName ?? null;

  return {
    fileUpload,
    status,
    progress,
    error,
    lastUpload,
    fileName,
    isUploading: status === 'uploading',
    uploadFile,
    handleFiles,
    handleInputChange,
  };
}
