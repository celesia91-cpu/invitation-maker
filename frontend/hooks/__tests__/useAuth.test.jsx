import { renderHook, waitFor } from '@testing-library/react';
import { AppStateProvider } from '../../context/AppStateContext.jsx';
import { AuthProvider } from '../../context/AuthContext.jsx';
import useAuth from '../useAuth.js';

const createWrapper = (apiClient) => ({ children }) => (
  <AppStateProvider>
    <AuthProvider apiClient={apiClient}>{children}</AuthProvider>
  </AppStateProvider>
);

describe('useAuth', () => {
  it('reports initialization progress and hydration results for persisted sessions', async () => {
    const getUser = jest.fn().mockReturnValue({ id: 'demo-user', role: 'creator' });
    const api = {
      isAuthenticated: jest.fn().mockReturnValue(true),
      getUser,
      login: jest.fn(),
      logout: jest.fn(),
      getCurrentUser: jest.fn(),
    };

    const states = [];
    const { result } = renderHook(() => {
      const value = useAuth();
      states.push({
        isAuthenticated: value.isAuthenticated,
        isInitialized: value.isInitialized,
      });
      return value;
    }, { wrapper: createWrapper(api) });

    expect(states[0]).toEqual({ isAuthenticated: false, isInitialized: false });

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(states[states.length - 1]).toEqual({
      isAuthenticated: true,
      isInitialized: true,
    });

    expect(api.isAuthenticated).toHaveBeenCalled();
    expect(getUser).toHaveBeenCalled();
  });
});
