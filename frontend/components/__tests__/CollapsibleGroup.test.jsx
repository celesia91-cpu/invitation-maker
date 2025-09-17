import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollapsibleGroup from '../CollapsibleGroup.jsx';
import { useHistoryReducer } from '../../hooks/useHistoryReducer.js';

jest.mock('../../hooks/useHistoryReducer.js', () => ({
  useHistoryReducer: jest.fn(),
}));

const setupHistoryMock = (overrides = {}) => {
  const history = {
    state: true,
    set: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    canUndo: false,
    canRedo: false,
    ...overrides,
  };

  useHistoryReducer.mockReturnValue(history);

  return history;
};

describe('CollapsibleGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('toggles the open state when the header button is clicked', async () => {
    const user = userEvent.setup();
    const history = setupHistoryMock({ state: true });

    render(
      <CollapsibleGroup title="Details">
        <p>Some content</p>
      </CollapsibleGroup>,
    );

    const toggleButton = screen.getByRole('button', { name: /hide details/i });
    await user.click(toggleButton);

    expect(history.set).toHaveBeenCalledTimes(1);
    expect(history.set).toHaveBeenCalledWith(false);
  });

  it('calls undo and redo when the corresponding buttons are enabled', async () => {
    const user = userEvent.setup();
    const history = setupHistoryMock({ canUndo: true, canRedo: true });

    render(
      <CollapsibleGroup title="Options">
        <p>Some content</p>
      </CollapsibleGroup>,
    );

    const undoButton = screen.getByRole('button', { name: /undo/i });
    const redoButton = screen.getByRole('button', { name: /redo/i });

    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeEnabled();

    await user.click(undoButton);
    await user.click(redoButton);

    expect(history.undo).toHaveBeenCalledTimes(1);
    expect(history.redo).toHaveBeenCalledTimes(1);
  });

  it('disables undo and redo buttons when history actions are unavailable', async () => {
    const user = userEvent.setup();
    const history = setupHistoryMock({ canUndo: false, canRedo: false });

    render(
      <CollapsibleGroup title="Settings">
        <p>Some content</p>
      </CollapsibleGroup>,
    );

    const undoButton = screen.getByRole('button', { name: /undo/i });
    const redoButton = screen.getByRole('button', { name: /redo/i });

    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();

    await user.click(undoButton);
    await user.click(redoButton);

    expect(history.undo).not.toHaveBeenCalled();
    expect(history.redo).not.toHaveBeenCalled();
  });
});
