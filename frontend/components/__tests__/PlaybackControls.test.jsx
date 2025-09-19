import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlaybackControls from '../PlaybackControls.jsx';

jest.mock('../../context/AppStateContext.jsx', () => {
  const React = require('react');
  const MockAppStateContext = React.createContext(null);

  return {
    __esModule: true,
    useAppState: () => React.useContext(MockAppStateContext),
    MockAppStateProvider: ({ value, children }) => (
      <MockAppStateContext.Provider value={value}>{children}</MockAppStateContext.Provider>
    ),
  };
});

import { MockAppStateProvider } from '../../context/AppStateContext.jsx';

function renderPlaybackControls({ initialPlaying = false } = {}) {
  const setPlayingSpy = jest.fn();

  function Wrapper({ children }) {
    const [playing, setPlaying] = React.useState(initialPlaying);

    const handleSetPlaying = React.useCallback(
      (value) => {
        setPlayingSpy(value);
        setPlaying(value);
      },
      []
    );

    const value = React.useMemo(
      () => ({
        playing,
        setPlaying: handleSetPlaying,
      }),
      [playing, handleSetPlaying]
    );

    return <MockAppStateProvider value={value}>{children}</MockAppStateProvider>;
  }

  return {
    setPlayingSpy,
    user: userEvent.setup(),
    ...render(<PlaybackControls />, { wrapper: Wrapper }),
  };
}

describe('PlaybackControls', () => {
  it('toggles playback state via Play/Pause button', async () => {
    const { user, setPlayingSpy } = renderPlaybackControls({ initialPlaying: false });

    const toggleButton = screen.getByRole('button', { name: /play/i });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggleButton);

    expect(setPlayingSpy).toHaveBeenNthCalledWith(1, true);
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    expect(toggleButton).toHaveTextContent(/pause/i);

    await user.click(toggleButton);

    expect(setPlayingSpy).toHaveBeenNthCalledWith(2, false);
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    expect(toggleButton).toHaveTextContent(/play/i);
  });

  it('stops playback when navigating with Prev/Next buttons', async () => {
    const { user, setPlayingSpy } = renderPlaybackControls({ initialPlaying: true });

    const toggleButton = screen.getByRole('button', { name: /pause/i });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /prev/i }));
    expect(setPlayingSpy).toHaveBeenNthCalledWith(1, false);
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    expect(toggleButton).toHaveTextContent(/play/i);

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(setPlayingSpy).toHaveBeenNthCalledWith(2, false);
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    expect(toggleButton).toHaveTextContent(/play/i);
  });
});
