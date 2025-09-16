import { useState } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';
import useAuth from '../hooks/useAuth.js';
import useModalFocusTrap from '../hooks/useModalFocusTrap.js';

export default function AuthModal({ isOpen, onClose }) {
  const { setTokenBalance } = useAppState();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useModalFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await auth.login({ email, password, remember });
      setTokenBalance(response.balance || 0);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="authModal"
      className="auth-modal show"
      role="dialog"
      aria-modal="true"
      aria-labelledby="authTitle"
      ref={modalRef}
    >
      <div className="auth-card">
        <h2 id="authTitle">Welcome to Invitation Maker</h2>
        <p>Sign in to save your projects to the cloud, or continue working offline.</p>

        <form id="loginForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loginEmail">Email address</label>
            <input
              type="email"
              id="loginEmail"
              name="loginEmail"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="loginPassword">Password</label>
            <input
              type="password"
              id="loginPassword"
              name="loginPassword"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              id="rememberMe"
              name="rememberMe"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="rememberMe" style={{ margin: 0 }}>Remember me</label>
          </div>

          {error && <div className="error" role="alert">{error}</div>}

          <button
            type="submit"
            className="btn primary"
            style={{ width: '100%', margin: '16px 0 8px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Don&apos;t have an account? Create one in your backend admin panel.
        </p>

        <button
          type="button"
          className="iconbtn"
          aria-label="Close"
          onClick={onClose}
          style={{ position: 'absolute', top: 8, right: 8 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

