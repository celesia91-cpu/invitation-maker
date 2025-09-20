import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toolbar from '../Toolbar.jsx';
import EditorProvider, { useEditor } from '../../context/EditorContext.jsx';
import { MockAppStateProvider } from '../../context/AppStateContext.jsx';

jest.mock('../../context/EditorContext.jsx', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }) => React.createElement(React.Fragment, null, children),
    useEditor: jest.fn(),
  };
});

const createState = (overrides = {}) => {
  const baseState = {
    slides: [{ id: 'slide_1', elements: [] }],
    selected: { slideId: 'slide_1', elementId: 'el-123' },
    viewport: { width: 1080, height: 1920, scale: 1 },
    ui: { showGrid: false, snapToGrid: true, showAuthModal: false, showShareModal: false },
  };

  return {
    ...baseState,
    ...overrides,
    selected: {
      ...baseState.selected,
      ...(overrides.selected ?? {}),
    },
  };
};

const renderToolbar = (stateOverrides, role = 'creator') => {
  const state = createState(stateOverrides);
  const dispatch = jest.fn();

  useEditor.mockReturnValue([state, dispatch]);

  const view = render(
    <MockAppStateProvider value={{ userRole: role }}>
      <EditorProvider>
        <Toolbar />
      </EditorProvider>
    </MockAppStateProvider>
  );

  return { ...view, dispatch };
};

afterEach(() => {
  useEditor.mockReset();
  jest.restoreAllMocks();
});

describe('Toolbar', () => {
  it('dispatches ADD_TEXT when "Add Text" is clicked', async () => {
    const user = userEvent.setup();
    const { dispatch } = renderToolbar();

    await user.click(screen.getByRole('button', { name: /add text/i }));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_TEXT' });
  });

  it('prompts for an image URL and dispatches ADD_IMAGE with that value', async () => {
    const user = userEvent.setup();
    const mockUrl = 'https://example.com/image.png';
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue(mockUrl);
    const { dispatch } = renderToolbar();

    await user.click(screen.getByRole('button', { name: /add image/i }));

    expect(promptSpy).toHaveBeenCalledWith('Image URL');
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_IMAGE', src: mockUrl });
  });

  it('dispatches DELETE_ELEMENT when "Delete" is clicked and an element is selected', async () => {
    const user = userEvent.setup();
    const selectedElementId = 'el-456';
    const { dispatch } = renderToolbar({ selected: { elementId: selectedElementId } });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeEnabled();

    await user.click(deleteButton);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'DELETE_ELEMENT', elementId: selectedElementId });
  });

  it('disables the "Delete" button when no element is selected', () => {
    const { dispatch } = renderToolbar({ selected: { elementId: null } });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('prevents editing actions for consumer roles', async () => {
    const user = userEvent.setup();
    const { dispatch } = renderToolbar({}, 'consumer');

    const addText = screen.getByRole('button', { name: /add text/i });
    const addImage = screen.getByRole('button', { name: /add image/i });

    expect(addText).toBeDisabled();
    expect(addImage).toBeDisabled();

    await user.click(addText);
    await user.click(addImage);

    expect(dispatch).not.toHaveBeenCalled();
  });
});
