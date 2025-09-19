import React from 'react';
import { act, renderHook } from '@testing-library/react';
import useFileUpload from '../useFileUpload.js';
import { AppStateProvider, useAppState } from '../../context/AppStateContext.jsx';

describe('useFileUpload', () => {
  const wrapper = ({ children }) => <AppStateProvider>{children}</AppStateProvider>;

  it('uploads a file and updates canvas state on success', async () => {
    const api = {
      uploadImage: jest.fn().mockResolvedValue({
        image: {
          id: 'img-1',
          url: 'https://example.com/image.png',
          thumbnailUrl: 'https://example.com/thumb.png',
          width: 640,
          height: 480,
        },
      }),
    };

    const { result } = renderHook(
      () => {
        const upload = useFileUpload({ api });
        const appState = useAppState();
        return { upload, appState };
      },
      { wrapper }
    );

    const file = new File(['hello'], 'party.png', { type: 'image/png' });

    await act(async () => {
      await result.current.upload.uploadFile(file);
    });

    expect(api.uploadImage).toHaveBeenCalledWith(file);
    expect(result.current.upload.status).toBe('success');
    expect(result.current.upload.progress).toBe(100);
    expect(result.current.upload.lastUpload).toEqual(
      expect.objectContaining({
        status: 'success',
        fileName: 'party.png',
      })
    );

    expect(result.current.appState.imgState.has).toBe(true);
    expect(result.current.appState.imgState.backendImageUrl).toBe(
      'https://example.com/image.png'
    );
    expect(result.current.appState.imgState.backendThumbnailUrl).toBe(
      'https://example.com/thumb.png'
    );
    expect(result.current.appState.imgState.natW).toBe(640);
    expect(result.current.appState.imgState.natH).toBe(480);
  });

  it('records errors when uploads fail', async () => {
    const error = new Error('Network down');
    const api = {
      uploadImage: jest.fn().mockRejectedValue(error),
    };

    const { result } = renderHook(() => useFileUpload({ api }), { wrapper });
    const file = new File(['oops'], 'broken.png', { type: 'image/png' });

    await act(async () => {
      await expect(result.current.uploadFile(file)).rejects.toThrow('Network down');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe(error);
    expect(result.current.lastUpload).toEqual(
      expect.objectContaining({
        status: 'error',
        fileName: 'broken.png',
        error,
      })
    );
  });
});
