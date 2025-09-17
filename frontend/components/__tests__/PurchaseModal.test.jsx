import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchaseModal from '../PurchaseModal.jsx';
import useModalFocusTrap from '../../hooks/useModalFocusTrap.js';

jest.mock('../../hooks/useModalFocusTrap.js', () => ({
  __esModule: true,
  default: jest.fn(() => ({ current: null })),
}));

describe('PurchaseModal', () => {
  beforeEach(() => {
    useModalFocusTrap.mockClear();
    useModalFocusTrap.mockImplementation(() => ({ current: null }));
  });

  it('does not render when the modal is closed', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { container } = render(
      <PurchaseModal isOpen={false} onConfirm={onConfirm} onCancel={onCancel} />
    );

    expect(useModalFocusTrap).toHaveBeenCalledWith(false, onCancel);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a dialog with accessibility attributes when open', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(<PurchaseModal isOpen onConfirm={onConfirm} onCancel={onCancel} />);

    expect(useModalFocusTrap).toHaveBeenCalledWith(true, onCancel);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('You need tokens to edit this design.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls the provided callbacks when action buttons are clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(<PurchaseModal isOpen onConfirm={onConfirm} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
