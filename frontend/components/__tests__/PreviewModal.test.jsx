import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewModal from '../PreviewModal.jsx';
import useModalFocusTrap from '../../hooks/useModalFocusTrap.js';

jest.mock('../../hooks/useModalFocusTrap.js', () => ({
  __esModule: true,
  default: jest.fn(() => ({ current: null })),
}));

describe('PreviewModal', () => {
  beforeEach(() => {
    useModalFocusTrap.mockClear();
    useModalFocusTrap.mockImplementation(() => ({ current: null }));
  });

  it('does not render when the modal is closed', () => {
    const onClose = jest.fn();
    const onUseDesign = jest.fn();

    const { container } = render(
      <PreviewModal isOpen={false} onClose={onClose} onUseDesign={onUseDesign} />
    );

    expect(useModalFocusTrap).toHaveBeenCalledWith(false, onClose);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog with accessibility attributes when open', () => {
    const onClose = jest.fn();
    const onUseDesign = jest.fn();

    render(<PreviewModal isOpen onClose={onClose} onUseDesign={onUseDesign} />);

    expect(useModalFocusTrap).toHaveBeenCalledWith(true, onClose);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: /use this design/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /favorite/i })).toBeInTheDocument();
  });

  it('invokes the provided callbacks when buttons are clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onUseDesign = jest.fn();

    render(<PreviewModal isOpen onClose={onClose} onUseDesign={onUseDesign} />);

    await user.click(screen.getByLabelText(/close preview/i));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /use this design/i }));
    expect(onUseDesign).toHaveBeenCalledTimes(1);
  });
});
