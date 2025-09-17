import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DragHandler from '../DragHandler.jsx';
import { useHistoryReducer } from '../../hooks/useHistoryReducer.js';

jest.mock('../../hooks/useHistoryReducer.js', () => ({
  useHistoryReducer: jest.fn(),
}));

const setupHistoryMock = (overrides = {}) => {
  const history = {
    state: { x: 0, y: 0 },
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

describe('DragHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls set with translated coordinates only while dragging', () => {
    const history = setupHistoryMock({ state: { x: 100, y: 50 } });

    const { container } = render(<DragHandler />);

    const draggable = container.querySelector('.draggable');
    expect(draggable).toBeTruthy();

    fireEvent.pointerMove(draggable, { clientX: 200, clientY: 200 });
    expect(history.set).not.toHaveBeenCalled();

    fireEvent.pointerDown(draggable, { clientX: 160, clientY: 90 });
    fireEvent.pointerMove(draggable, { clientX: 210, clientY: 140 });

    expect(history.set).toHaveBeenCalledTimes(1);
    expect(history.set).toHaveBeenCalledWith({ x: 150, y: 100 });

    fireEvent.pointerUp(draggable);
    fireEvent.pointerMove(draggable, { clientX: 220, clientY: 150 });

    expect(history.set).toHaveBeenCalledTimes(1);
  });

  it('calls undo and redo when buttons are clicked and enabled', async () => {
    const history = setupHistoryMock({ canUndo: true, canRedo: true });
    const user = userEvent.setup();

    render(<DragHandler />);

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
    const history = setupHistoryMock({ canUndo: false, canRedo: false });
    const user = userEvent.setup();

    render(<DragHandler />);

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
