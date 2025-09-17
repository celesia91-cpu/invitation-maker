import { render, screen, fireEvent } from '@testing-library/react';
import Topbar from '../Topbar.jsx';

describe('Topbar', () => {
  it('fires handlers and renders static controls', () => {
    const onPreviewClick = jest.fn();
    const onShareClick = jest.fn();
    const onTogglePanel = jest.fn();

    const { rerender } = render(
      <Topbar
        onPreviewClick={onPreviewClick}
        onShareClick={onShareClick}
        onTogglePanel={onTogglePanel}
        panelOpen
      />
    );

    const previewButton = screen.getByRole('button', { name: 'Preview' });
    const shareButton = screen.getByRole('button', { name: 'Share' });
    const panelButton = screen.getByRole('button', { name: 'Panel' });

    expect(panelButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(previewButton);
    fireEvent.click(shareButton);
    fireEvent.click(panelButton);

    expect(onPreviewClick).toHaveBeenCalledTimes(1);
    expect(onShareClick).toHaveBeenCalledTimes(1);
    expect(onTogglePanel).toHaveBeenCalledTimes(1);

    rerender(
      <Topbar
        onPreviewClick={onPreviewClick}
        onShareClick={onShareClick}
        onTogglePanel={onTogglePanel}
        panelOpen={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Panel' })).toHaveAttribute('aria-expanded', 'false');

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    expect(screen.getByText('Slide 1/1')).toBeInTheDocument();
  });
});
