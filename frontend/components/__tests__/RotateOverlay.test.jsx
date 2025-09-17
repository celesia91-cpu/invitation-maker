import { render, screen } from '@testing-library/react';
import RotateOverlay from '../RotateOverlay.jsx';

describe('RotateOverlay', () => {
  it('renders a hidden overlay containing the rotate message heading', () => {
    const { container } = render(<RotateOverlay />);
    const overlay = container.querySelector('#rotateOverlay');

    expect(overlay).not.toBeNull();
    expect(overlay).toHaveAttribute('aria-hidden', 'true');

    const heading = screen.getByRole('heading', { name: 'Please rotate your device' });
    expect(overlay).toContainElement(heading);
  });
});
