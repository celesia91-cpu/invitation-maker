import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchaseModal from '../PurchaseModal.jsx';
import useModalFocusTrap from '../../hooks/useModalFocusTrap.js';
import useDesignOwnership from '../../hooks/useDesignOwnership.js';

jest.mock('../../hooks/useModalFocusTrap.js', () => ({
  __esModule: true,
  default: jest.fn(() => ({ current: null })),
}));

jest.mock('../../hooks/useDesignOwnership.js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const createOwnershipValue = (overrides = {}) => ({
  currentDesignId: 'purchase-design',
  setCurrentDesignId: jest.fn(),
  isDesignOwned: jest.fn().mockReturnValue(false),
  markDesignOwned: jest.fn(),
  loading: false,
  error: null,
  ...overrides,
});

describe('PurchaseModal', () => {
  let designOwnership;

  beforeEach(() => {
    useModalFocusTrap.mockClear();
    useModalFocusTrap.mockImplementation(() => ({ current: null }));
    useDesignOwnership.mockReset();
    designOwnership = createOwnershipValue();
    useDesignOwnership.mockReturnValue(designOwnership);
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
    expect(screen.getByRole('button', { name: /confirm purchase/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls the provided callbacks when action buttons are clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(<PurchaseModal isOpen onConfirm={onConfirm} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /confirm purchase/i }));
    expect(onConfirm).toHaveBeenCalledWith({ designId: 'purchase-design', owned: true });
    expect(designOwnership.markDesignOwned).toHaveBeenCalledWith('purchase-design', expect.objectContaining({ owned: true }));

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows an alternate message when the design is already owned', () => {
    const ownership = createOwnershipValue({
      isDesignOwned: jest.fn().mockReturnValue(true),
      currentDesignId: 'owned',
    });
    useDesignOwnership.mockReturnValue(ownership);

    render(<PurchaseModal isOpen designId="owned" onConfirm={() => {}} onCancel={() => {}} />);

    expect(screen.getByText(/you already own this design/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start editing/i })).toBeInTheDocument();
  });
});
