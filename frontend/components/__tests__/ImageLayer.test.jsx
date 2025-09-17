import React from 'react';
import { render } from '@testing-library/react';
import ImageLayer from '../ImageLayer.jsx';

describe('ImageLayer', () => {
  it('renders wrapper div with expected positioning styles and element id', () => {
    const element = {
      id: 'image-123',
      type: 'image',
      x: 10,
      y: 20,
      width: 300,
      height: 150,
      rotation: 45,
      src: '/example.jpg',
      fit: 'cover',
    };

    const { container } = render(<ImageLayer element={element} />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveAttribute('data-element-id', element.id);
    expect(wrapper?.style.left).toBe('10px');
    expect(wrapper?.style.top).toBe('20px');
    expect(wrapper?.style.width).toBe('300px');
    expect(wrapper?.style.height).toBe('150px');
    expect(wrapper?.style.transform).toBe('rotate(45deg)');
  });

  it('passes fallback image source and fit style to nested image', () => {
    const element = {
      id: 'image-456',
      type: 'image',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      src: '',
      fit: 'contain',
    };

    const { container } = render(<ImageLayer element={element} />);

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/placeholder.jpg');
    expect(image?.style.objectFit).toBe('contain');
  });
});
