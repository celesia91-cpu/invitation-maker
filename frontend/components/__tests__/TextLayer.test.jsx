jest.mock('react', () => {
  const actual = jest.requireActual('react');
  const mock = { ...actual };
  const actualUseReducer = actual.useReducer.bind(actual);
  mock.__actualUseReducer = actualUseReducer;
  mock.useReducer = jest.fn(actualUseReducer);
  mock.default = mock;
  return mock;
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import TextLayer from '../TextLayer.jsx';
import EditorProvider from '../../context/EditorContext.jsx';

const createElement = (overrides = {}) => ({
  id: 'el_1',
  type: 'text',
  x: 120,
  y: 160,
  width: 360,
  height: 180,
  rotation: 12,
  content: 'Editable content',
  ...overrides,
  style: {
    color: '#123456',
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 600,
    textAlign: 'left',
    ...(overrides.style || {}),
  },
});

const createEditorState = (overrides = {}) => {
  const baseState = {
    slides: [{ id: 'slide_1', elements: [] }],
    selected: { slideId: 'slide_1', elementId: null },
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
    viewport: {
      ...baseState.viewport,
      ...(overrides.viewport ?? {}),
    },
    ui: {
      ...baseState.ui,
      ...(overrides.ui ?? {}),
    },
  };
};

function useMockedEditorProvider(state, dispatch) {
  const hasMocked = React.useRef(false);

  if (!hasMocked.current) {
    React.useReducer.mockImplementation(() => [state, dispatch]);
    hasMocked.current = true;
  }
}

function EditorProviderWithSpy({ state, dispatch, children }) {
  useMockedEditorProvider(state, dispatch);
  return (
    <EditorProvider initial={state}>
      {children}
    </EditorProvider>
  );
}

function renderTextLayer(element, stateOverrides) {
  const state = createEditorState(stateOverrides);
  const dispatch = jest.fn();
  const view = render(
    <EditorProviderWithSpy state={state} dispatch={dispatch}>
      <TextLayer element={element} />
    </EditorProviderWithSpy>
  );

  const rerenderWithElement = (nextElement) =>
    view.rerender(
      <EditorProviderWithSpy state={state} dispatch={dispatch}>
        <TextLayer element={nextElement} />
      </EditorProviderWithSpy>
    );

  return { ...view, dispatch, rerenderWithElement };
}

describe('TextLayer', () => {
  afterEach(() => {
    React.useReducer.mockImplementation(React.__actualUseReducer);
  });

  it('renders an editable div with inline styles derived from the element style', () => {
    const element = createElement({
      id: 'el_text',
      x: 100,
      y: 140,
      width: 420,
      height: 200,
      rotation: 18,
      style: {
        color: '#ff00aa',
        fontFamily: 'Roboto',
        fontSize: 32,
        fontWeight: 700,
        textAlign: 'right',
      },
    });

    const { container } = renderTextLayer(element, {
      selected: { elementId: element.id },
    });

    const editable = container.querySelector(`[data-element-id="${element.id}"]`);
    expect(editable).toBeInTheDocument();
    expect(editable).toHaveAttribute('contenteditable', 'true');
    expect(editable).toHaveAttribute('data-element-id', element.id);
    expect(editable.style.position).toBe('absolute');
    expect(editable.style.left).toBe(`${element.x}px`);
    expect(editable.style.top).toBe(`${element.y}px`);
    expect(editable.style.width).toBe(`${element.width}px`);
    expect(editable.style.height).toBe(`${element.height}px`);
    expect(editable.style.transform).toBe(`rotate(${element.rotation}deg)`);
    expect(editable).toHaveStyle(`color: ${element.style.color}`);
    expect(editable.style.fontFamily).toBe(element.style.fontFamily);
    expect(editable.style.fontSize).toBe(`${element.style.fontSize}px`);
    expect(editable.style.fontWeight).toBe(String(element.style.fontWeight));
    expect(editable.style.textAlign).toBe(element.style.textAlign);
  });

  it('dispatches UPDATE_TEXT when the content changes on blur', () => {
    const element = createElement({
      id: 'el_text',
      content: 'Original value',
    });

    const { container, rerenderWithElement, dispatch } = renderTextLayer(element, {
      selected: { elementId: element.id },
    });

    const getEditable = () => container.querySelector(`[data-element-id="${element.id}"]`);

    const editable = getEditable();
    expect(editable).toHaveTextContent(element.content);
    expect(dispatch).not.toHaveBeenCalled();

    const updatedContent = 'Updated content';
    editable.innerText = updatedContent;
    fireEvent.blur(editable);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_TEXT',
      elementId: element.id,
      patch: { content: updatedContent },
    });

    dispatch.mockClear();

    rerenderWithElement({ ...element, content: updatedContent });

    const stableEditable = getEditable();
    fireEvent.blur(stableEditable);

    expect(dispatch).not.toHaveBeenCalled();
  });
});
