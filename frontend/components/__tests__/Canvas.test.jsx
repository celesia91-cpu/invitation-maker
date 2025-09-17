import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Canvas from '../Canvas.jsx';
import EditorProvider from '../../context/EditorContext.jsx';

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

describe('Canvas', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders text and image layers for the active slide', () => {
    const { container } = render(
      <EditorProvider
        initial={{
          slides: [createSlideWithElements()],
          selected: { slideId: 'slide_1', elementId: null },
          viewport: baseViewport,
        }}
      >
        <Canvas />
      </EditorProvider>
    );

    const textLayer = container.querySelector('[data-element-id="text-1"]');
    expect(textLayer).toBeInTheDocument();
    expect(textLayer).toHaveTextContent('Hello world');

    const imageLayer = container.querySelector('[data-element-id="image-1"]');
    expect(imageLayer).toBeInTheDocument();
    expect(imageLayer?.querySelector('img')).toBeInTheDocument();
  });

  it('renders a blank fallback when no slides exist', () => {
    const { container } = render(
      <EditorProvider initial={{ slides: [], viewport: baseViewport }}>
        <Canvas />
      </EditorProvider>
    );

    const fallback = container.firstChild;
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveStyle('flex: 1');
  });

  it('dispatches SELECT_ELEMENT with the clicked element id', async () => {
    const user = userEvent.setup();
    const dispatch = jest.fn();
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

    jest.spyOn(React, 'useReducer').mockImplementation(() => [state, dispatch]);

    const { container } = render(
      <EditorProvider>
        <Canvas />
      </EditorProvider>
    );

    const target = container.querySelector('[data-element-id="text-1"]');
    expect(target).toBeInTheDocument();

    await user.click(target);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SELECT_ELEMENT', elementId: 'text-1' });
  });
});
