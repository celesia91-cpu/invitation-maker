import React from 'react';
import { render, screen } from '@testing-library/react';
import ImageCanvas from '../ImageCanvas.jsx';

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

function renderImageCanvas(value, childNodes = null) {
  return render(
    <MockAppStateProvider value={value}>
      <ImageCanvas>{childNodes}</ImageCanvas>
    </MockAppStateProvider>
  );
}

describe('ImageCanvas', () => {
  const baseImgState = {
    has: false,
    natW: 320,
    natH: 200,
    cx: 160,
    cy: 100,
    scale: 3,
    angle: Math.PI / 6,
    shearX: 0.25,
    shearY: -0.3,
    signX: -1,
    signY: -1,
    flip: true,
    backendImageUrl: null,
    backendThumbnailUrl: null,
  };

  it('uses work size dimensions and transform with flip/signs while showing placeholder', () => {
    const workSize = { w: 640, h: 360 };

    const { container } = renderImageCanvas({
      imgState: { ...baseImgState },
      workSize,
    });

    const work = container.querySelector('#work');
    expect(work).toBeInTheDocument();
    expect(work.style.width).toBe(`${workSize.w}px`);
    expect(work.style.height).toBe(`${workSize.h}px`);

    const wrapper = container.querySelector('#userBgWrap');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.style.width).toBe(`${baseImgState.natW}px`);
    expect(wrapper.style.height).toBe(`${baseImgState.natH}px`);

    const expectedTransform = [
      'translate(-50%,-50%)',
      `rotate(${baseImgState.angle}rad)`,
      `skew(${baseImgState.shearX}rad, ${baseImgState.shearY}rad)`,
      `scale(${baseImgState.scale * ((baseImgState.flip ? -1 : 1) * (baseImgState.signX ?? 1))}, ${
        baseImgState.scale * (baseImgState.signY ?? 1)
      })`,
    ].join(' ');

    expect(wrapper.style.transform).toBe(expectedTransform);

    expect(screen.getByText(/no image selected/i)).toBeInTheDocument();
  });

  it('renders the background image using provided backend urls when available', () => {
    const workSize = { w: 500, h: 500 };
    const imageUrls = {
      backendImageUrl: 'https://example.com/full.png',
      backendThumbnailUrl: 'https://example.com/thumb.png',
    };

    renderImageCanvas({
      imgState: {
        ...baseImgState,
        ...imageUrls,
        has: true,
        scale: 1,
        angle: 0,
        shearX: 0,
        shearY: 0,
        signX: 1,
        signY: 1,
        flip: false,
      },
      workSize,
    });

    expect(screen.queryByText(/no image selected/i)).not.toBeInTheDocument();

    const image = screen.getByAltText('Background');
    expect(image).toHaveAttribute('src', imageUrls.backendImageUrl);
  });

  it('renders children inside the canvas container', () => {
    const { container } = renderImageCanvas(
      {
        imgState: { ...baseImgState },
        workSize: { w: 400, h: 300 },
      },
      <span data-testid="overlay">Overlay</span>
    );

    const overlay = container.querySelector('[data-testid="overlay"]');
    expect(overlay).toBeInTheDocument();
  });
});
