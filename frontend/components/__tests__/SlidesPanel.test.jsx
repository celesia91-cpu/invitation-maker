let currentDispatchSpy;

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useReducer: jest.fn(function mockUseReducer(reducer, initialArg, init) {
      const [state, dispatch] =
        arguments.length > 2
          ? actualReact.useReducer(reducer, initialArg, init)
          : actualReact.useReducer(reducer, initialArg);

      const wrappedDispatch = (action) => {
        if (typeof currentDispatchSpy === 'function') {
          currentDispatchSpy(action);
        }
        return dispatch(action);
      };

      return [state, wrappedDispatch];
    }),
  };
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SlidesPanel from '../SlidesPanel.jsx';
import EditorProvider from '../../context/EditorContext.jsx';
import { MockAppStateProvider } from '../../context/AppStateContext.jsx';

const createInitialState = () => ({
  slides: [
    { id: 'slide_1', name: 'Intro', elements: [] },
    { id: 'slide_details', name: 'Details', elements: [] },
  ],
  selected: { slideId: 'slide_details', elementId: null },
});

function renderSlidesPanel(initial = createInitialState()) {
  const dispatchSpy = jest.fn();
  currentDispatchSpy = dispatchSpy;

  const view = render(
    <MockAppStateProvider value={{ userRole: 'creator' }}>
      <EditorProvider initial={initial}>
        <SlidesPanel />
      </EditorProvider>
    </MockAppStateProvider>
  );

  return { ...view, dispatchSpy };
}

describe('SlidesPanel', () => {
  afterEach(() => {
    currentDispatchSpy = undefined;
    jest.clearAllMocks();
  });

  it('dispatches ADD_SLIDE when the "+ Add" button is clicked', async () => {
    const user = userEvent.setup();
    const { dispatchSpy } = renderSlidesPanel();

    const addButton = screen.getByRole('button', { name: /\+ add/i });
    await user.click(addButton);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'ADD_SLIDE' });
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    const newSlideButton = await screen.findByRole('button', { name: /slide 3/i });
    expect(newSlideButton).toBeInTheDocument();
  });

  it('dispatches SELECT_SLIDE and updates selected styling when a slide button is clicked', async () => {
    const user = userEvent.setup();
    const { dispatchSpy } = renderSlidesPanel();

    const introButton = screen.getByRole('button', { name: 'Intro' });
    const detailsButton = screen.getByRole('button', { name: 'Details' });

    expect(detailsButton).toHaveStyle('background: #eef2ff');
    expect(introButton).toHaveStyle('background: white');

    await user.click(introButton);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'SELECT_SLIDE', slideId: 'slide_1' });
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(introButton).toHaveStyle('background: #eef2ff');
      expect(detailsButton).toHaveStyle('background: white');
    });
  });

  it('disables adding slides for consumer roles', async () => {
    const user = userEvent.setup();
    currentDispatchSpy = undefined;

    render(
      <MockAppStateProvider value={{ userRole: 'consumer' }}>
        <EditorProvider initial={createInitialState()}>
          <SlidesPanel />
        </EditorProvider>
      </MockAppStateProvider>
    );

    const addButton = screen.getByRole('button', { name: /\+ add/i });
    expect(addButton).toBeDisabled();

    await user.click(addButton);
    expect(currentDispatchSpy).toBeUndefined();
  });
});
