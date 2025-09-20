import { render, screen, fireEvent } from '@testing-library/react';
import Topbar from '../Topbar.jsx';
import { MockAppStateProvider } from '../../context/AppStateContext.jsx';

function renderWithRole(role = 'creator', props = {}) {
  return render(
    <MockAppStateProvider value={{ userRole: role }}>
      <Topbar
        onPreviewClick={props.onPreviewClick}
        onShareClick={props.onShareClick}
        onTogglePanel={props.onTogglePanel}
        panelOpen={props.panelOpen}
      />
    </MockAppStateProvider>
  );
}

describe('Topbar', () => {
  it('allows creator roles to interact with editing controls', () => {
    const onPreviewClick = jest.fn();
    const onShareClick = jest.fn();
    const onTogglePanel = jest.fn();

    const { rerender } = renderWithRole('creator', {
      onPreviewClick,
      onShareClick,
      onTogglePanel,
      panelOpen: true,
    });

    const previewButton = screen.getByRole('button', { name: 'Preview' });
    const shareButton = screen.getByRole('button', { name: 'Share' });
    const panelButton = screen.getByRole('button', { name: 'Panel' });

    expect(panelButton).toHaveAttribute('aria-expanded', 'true');
    expect(previewButton).toBeEnabled();
    expect(panelButton).toBeEnabled();

    fireEvent.click(previewButton);
    fireEvent.click(shareButton);
    fireEvent.click(panelButton);

    expect(onPreviewClick).toHaveBeenCalledTimes(1);
    expect(onShareClick).toHaveBeenCalledTimes(1);
    expect(onTogglePanel).toHaveBeenCalledTimes(1);

    rerender(
      <MockAppStateProvider value={{ userRole: 'creator' }}>
        <Topbar
          onPreviewClick={onPreviewClick}
          onShareClick={onShareClick}
          onTogglePanel={onTogglePanel}
          panelOpen={false}
        />
      </MockAppStateProvider>
    );

    expect(screen.getByRole('button', { name: 'Panel' })).toHaveAttribute('aria-expanded', 'false');

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    expect(screen.getByText('Slide 1/1')).toBeInTheDocument();
  });

  it('disables editing controls for consumer roles', () => {
    const onPreviewClick = jest.fn();
    const onShareClick = jest.fn();
    const onTogglePanel = jest.fn();

    renderWithRole('consumer', {
      onPreviewClick,
      onShareClick,
      onTogglePanel,
      panelOpen: true,
    });

    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Panel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled();
    expect(screen.getByText(/view only/i)).toHaveTextContent('consumer');

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(onShareClick).toHaveBeenCalledTimes(1);
    expect(onPreviewClick).not.toHaveBeenCalled();
    expect(onTogglePanel).not.toHaveBeenCalled();
  });
});
