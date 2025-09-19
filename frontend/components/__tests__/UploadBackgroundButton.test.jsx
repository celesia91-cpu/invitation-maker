import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadBackgroundButton from '../UploadBackgroundButton.jsx';
import useFileUpload from '../../hooks/useFileUpload.js';

jest.mock('../../hooks/useFileUpload.js');

describe('UploadBackgroundButton', () => {
  const setupHook = (overrides = {}) => {
    const defaultState = {
      status: 'idle',
      progress: 0,
      error: null,
      lastUpload: null,
      isUploading: false,
      handleInputChange: jest.fn(),
    };
    useFileUpload.mockReturnValue({ ...defaultState, ...overrides });
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the upload button enabled by default', () => {
    setupHook();

    render(<UploadBackgroundButton api={{ uploadImage: jest.fn() }} />);

    const button = screen.getByRole('button', { name: /upload background/i });
    expect(button).toBeEnabled();
  });

  it('disables the button and shows progress while uploading', () => {
    setupHook({ status: 'uploading', progress: 42, isUploading: true });

    render(<UploadBackgroundButton api={{ uploadImage: jest.fn() }} />);

    const button = screen.getByRole('button', { name: /uploading/i });
    expect(button).toBeDisabled();

    const progress = screen.getByLabelText(/upload progress/i);
    expect(progress).toHaveAttribute('value', '42');
  });

  it('announces successful uploads', () => {
    setupHook({
      status: 'success',
      progress: 100,
      lastUpload: { status: 'success', fileName: 'party.png' },
    });

    render(<UploadBackgroundButton api={{ uploadImage: jest.fn() }} />);

    expect(screen.getByRole('status')).toHaveTextContent('party.png');
  });

  it('surfaces upload errors', () => {
    const error = new Error('Upload failed');
    setupHook({
      status: 'error',
      error,
      lastUpload: { status: 'error', fileName: 'party.png', error },
    });

    render(<UploadBackgroundButton api={{ uploadImage: jest.fn() }} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed');
  });

  it('passes change events to the file upload hook', () => {
    const handleInputChange = jest.fn();
    setupHook({ handleInputChange });

    render(<UploadBackgroundButton api={{ uploadImage: jest.fn() }} />);

    const input = screen.getByLabelText(/upload background image/i);
    fireEvent.change(input, { target: { files: [new File(['a'], 'demo.png', { type: 'image/png' })] } });

    expect(handleInputChange).toHaveBeenCalled();
  });
});
