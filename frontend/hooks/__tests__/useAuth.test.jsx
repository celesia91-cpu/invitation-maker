import { renderHook, waitFor } from '@testing-library/react';
import { AppStateProvider } from '../../context/AppStateContext.jsx';
import useAuth from '../useAuth.js';
import useApiClient from '../useApiClient.js';

jest.mock('../useApiClient.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const wrapper = ({ children }) => <AppStateProvider>{children}</AppStateProvider>;

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports unauthenticated until the client initialization effect completes', async () => {
    const getUser = jest.fn().mockReturnValue({ id: 'demo-user', role: 'creator' });
    const api = {
      isAuthenticated: jest.fn().mockReturnValue(true),
      getUser,
      login: jest.fn(),
      logout: jest.fn(),
      getCurrentUser: jest.fn(),
    };

    useApiClient.mockReturnValue(api);

    const states = [];
    const { result } = renderHook(() => {
      const value = useAuth();
      states.push(value.isAuthenticated);
      return value;
    }, { wrapper });

    expect(states[0]).toBe(false);

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(api.isAuthenticated).toHaveBeenCalled();
    expect(getUser).toHaveBeenCalled();
  });
});
