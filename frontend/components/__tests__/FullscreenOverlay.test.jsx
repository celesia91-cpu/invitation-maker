import { render, screen } from '@testing-library/react';
import FullscreenOverlay from '../FullscreenOverlay.jsx';

describe('FullscreenOverlay', () => {
  it('renders a modal dialog with the expected accessibility attributes', () => {
    render(<FullscreenOverlay />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'fsTitle');
  });

  it('displays the enter full screen button', () => {
    render(<FullscreenOverlay />);

    expect(screen.getByRole('button', { name: 'Enter Full-Screen' })).toBeInTheDocument();
  });
});
