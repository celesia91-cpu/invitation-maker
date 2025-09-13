import { useState } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

export default function AuthModal({ isOpen, onClose }) {
  const { setTokenBalance } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Placeholder for real API call
    await new Promise((resolve) => setTimeout(resolve, 300));
    setTokenBalance(100); // simulate received balance
    setIsSubmitting(false);
    onClose?.();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <form onSubmit={handleSubmit}>
          <h2>Login</h2>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Login'}
          </button>
          <button type="button" onClick={onClose}>Close</button>
        </form>
      </div>
    </div>
  );
}
