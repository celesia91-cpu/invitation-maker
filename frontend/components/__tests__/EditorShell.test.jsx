import React from 'react';
import { render, screen } from '@testing-library/react';
import EditorShell from '../EditorShell.jsx';

describe('EditorShell', () => {
  const initialState = {
    slides: [
      {
        id: 'slide_test',
        name: 'My Test Slide',
        elements: [
          {
            id: 'text-1',
            type: 'text',
            x: 0,
            y: 0,
            width: 200,
            height: 80,
            rotation: 0,
            content: 'Hello from the initial slide',
            style: {
              color: '#111',
              fontFamily: 'Arial, sans-serif',
              fontSize: 24,
              fontWeight: 400,
              textAlign: 'center',
            },
          },
        ],
      },
    ],
    selected: { slideId: 'slide_test', elementId: null },
    viewport: { width: 640, height: 360, scale: 1 },
  };

  it('renders the core editor layout when provided with an initial state', () => {
    render(<EditorShell initial={initialState} />);

    expect(screen.getByRole('button', { name: /add text/i })).toBeInTheDocument();
    expect(screen.getByText('Slides')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Test Slide' })).toBeInTheDocument();
    expect(screen.getByText('Hello from the initial slide')).toBeInTheDocument();
  });
});
