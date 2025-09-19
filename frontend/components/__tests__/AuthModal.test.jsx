import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import AuthModal from '../AuthModal.jsx';
import useAuth from '../../hooks/useAuth.js';
import { useAppState } from '../../context/AppStateContext.jsx';
import useModalFocusTrap from '../../hooks/useModalFocusTrap.js';

jest.mock('../../hooks/useAuth.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../context/AppStateContext.jsx', () => ({
  __esModule: true,
  useAppState: jest.fn(),
}));

jest.mock('../../hooks/useModalFocusTrap.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const loginMock = jest.fn();
const setTokenBalanceMock = jest.fn();
const setUserRoleMock = jest.fn();
const resetUserRoleMock = jest.fn();

describe('AuthModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loginMock.mockReset();
    setTokenBalanceMock.mockReset();
    setUserRoleMock.mockReset();
    resetUserRoleMock.mockReset();

    useAuth.mockReturnValue({ login: loginMock });
    useAppState.mockReturnValue({
      setTokenBalance: setTokenBalanceMock,
      setUserRole: setUserRoleMock,
      resetUserRole: resetUserRoleMock,
    });
    useModalFocusTrap.mockReturnValue({ current: null });
  });

  it('does not render when the modal is closed', () => {
    const { container } = render(<AuthModal isOpen={false} onClose={jest.fn()} />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('submits credentials, updates balance, and closes on successful login', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    loginMock.mockResolvedValue({ balance: 25, user: { role: 'admin' } });

    render(<AuthModal isOpen onClose={onClose} />);

    expect(useModalFocusTrap).toHaveBeenCalledWith(true, onClose);

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'supersecret');
    await user.click(screen.getByLabelText(/remember me/i));

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
    expect(loginMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'supersecret',
      remember: true,
    });

    await waitFor(() => expect(setTokenBalanceMock).toHaveBeenCalledWith(25));
    await waitFor(() => expect(setUserRoleMock).toHaveBeenCalledWith('admin'));
    expect(resetUserRoleMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  it('shows an error and resets submitting state when login fails', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    let rejectLogin;

    loginMock.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectLogin = reject;
        })
    );

    render(<AuthModal isOpen onClose={onClose} />);

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'supersecret');

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
    );

    await act(async () => {
      rejectLogin(new Error('Invalid credentials'));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
    expect(setTokenBalanceMock).not.toHaveBeenCalled();
    expect(setUserRoleMock).not.toHaveBeenCalled();
    expect(resetUserRoleMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
