import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Canvas from '../Canvas.jsx';
import EditorProvider, { useEditor } from '../../context/EditorContext.jsx';

jest.mock('../../context/EditorContext.jsx', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }) => React.createElement(React.Fragment, null, children),
    useEditor: jest.fn(),
  };
});

const baseViewport = { width: 1080, height: 1920, scale: 1 };

const createSlideWithElements = () => ({
  id: 'slide_1',
  elements: [
    {
      id: 'text-1',
      type: 'text',
      x: 50,
      y: 60,
      width: 200,
      height: 80,
      rotation: 0,
      content: 'Hello world',
      style: {
        color: '#111',
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 400,
        textAlign: 'center',
      },
    },
    {
      id: 'image-1',
      type: 'image',
      x: 120,
      y: 200,
      width: 320,
      height: 240,
      rotation: 0,
      src: '/example.png',
      fit: 'cover',
    },
  ],
});

const renderCanvas = (state, dispatch = jest.fn()) => {
  useEditor.mockReturnValue([state, dispatch]);
  const view = render(
    <EditorProvider>
      <Canvas />
    </EditorProvider>
  );
  return { ...view, dispatch };
};

describe('Canvas', () => {
  afterEach(() => {
    useEditor.mockReset();
    jest.restoreAllMocks();
  });

  it('renders text and image layers for the active slide', () => {
    const state = {
      slides: [createSlideWithElements()],
      selected: { slideId: 'slide_1', elementId: null },
      viewport: baseViewport,
    };

    const { container } = renderCanvas(state);

    const textLayer = container.querySelector('[data-element-id="text-1"]');
    expect(textLayer).toBeInTheDocument();
    expect(textLayer).toHaveTextContent('Hello world');

    const imageLayer = container.querySelector('[data-element-id="image-1"]');
    expect(imageLayer).toBeInTheDocument();
    expect(imageLayer?.querySelector('img')).toBeInTheDocument();
  });

  it('renders a blank fallback when no slides exist', () => {
    const state = {
      slides: [],
      selected: { slideId: null, elementId: null },
      viewport: baseViewport,
    };

    const { container } = renderCanvas(state);

    const fallback = container.firstChild;
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveStyle('flex: 1');
  });

  it('dispatches SELECT_ELEMENT with the clicked element id', async () => {
    const user = userEvent.setup();
    const state = {
      slides: [
        {
          id: 'slide_1',
          elements: [
            {
              id: 'text-1',
              type: 'text',
              x: 0,
              y: 0,
              width: 100,
              height: 40,
              rotation: 0,
              content: 'Click me',
              style: {
                color: '#000',
                fontFamily: 'Arial',
                fontSize: 16,
                fontWeight: 400,
                textAlign: 'left',
              },
            },
          ],
        },
      ],
      selected: { slideId: 'slide_1', elementId: null },
      viewport: baseViewport,
      ui: { showGrid: false, snapToGrid: true, showAuthModal: false, showShareModal: false },
    };

    const { container, dispatch } = renderCanvas(state);

    const target = container.querySelector('[data-element-id="text-1"]');
    expect(target).toBeInTheDocument();

    await user.click(target);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SELECT_ELEMENT', elementId: 'text-1' });
  });
});
