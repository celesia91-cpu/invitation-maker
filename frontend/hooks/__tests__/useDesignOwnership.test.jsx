import { act, renderHook, waitFor } from '@testing-library/react';
import { AppStateProvider } from '../../context/AppStateContext.jsx';
import useDesignOwnership from '../useDesignOwnership.js';
import useAuth from '../useAuth.js';

jest.mock('../useAuth.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const wrapper = ({ children }) => (
  <AppStateProvider>{children}</AppStateProvider>
);

describe('useDesignOwnership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads owned designs for authenticated users and reports ownership', async () => {
    const getUserDesigns = jest.fn().mockResolvedValue({ designs: [{ id: 'design-1' }, { id: 'design-2', owned: false }] });
    useAuth.mockReturnValue({
      isAuthenticated: true,
      api: { getUserDesigns },
    });

    const { result } = renderHook(() => useDesignOwnership(), { wrapper });

    await act(async () => {
      await result.current.refreshOwnership();
    });

    expect(result.current.isDesignOwned('design-1')).toBe(true);
    expect(result.current.isDesignOwned('design-2')).toBe(false);
  });

  it('exposes manual refresh helpers and surfaces errors', async () => {
    const error = new Error('network');
    const getUserDesigns = jest.fn().mockRejectedValue(error);
    useAuth.mockReturnValue({
      isAuthenticated: true,
      api: { getUserDesigns },
    });

    const { result } = renderHook(() => useDesignOwnership(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(getUserDesigns).toHaveBeenCalled();
    });
    expect(result.current.error?.message).toBe('network');
    expect(result.current.isDesignOwned('unknown')).toBe(false);

    await act(async () => {
      await expect(result.current.refreshOwnership()).rejects.toThrow('network');
    });

    const recoveryResponse = { designs: [{ id: 'restored', owned: true }] };
    getUserDesigns.mockResolvedValueOnce(recoveryResponse);

    await act(async () => {
      await result.current.refreshOwnership();
    });

    expect(result.current.isDesignOwned('restored')).toBe(true);
  });

  it('allows manually marking and clearing ownership entries', async () => {
    const getUserDesigns = jest.fn().mockResolvedValue({ designs: [] });
    useAuth.mockReturnValue({
      isAuthenticated: true,
      api: { getUserDesigns },
    });

    const { result } = renderHook(() => useDesignOwnership(), { wrapper });

    await waitFor(() => {
      expect(getUserDesigns).toHaveBeenCalledTimes(1);
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isDesignOwned('manual')).toBe(false);

    act(() => {
      result.current.markDesignOwned('manual');
    });

    expect(result.current.isDesignOwned('manual')).toBe(true);

    act(() => {
      result.current.clearDesignOwnership('manual');
    });

    expect(result.current.isDesignOwned('manual')).toBe(false);
  });
});
