import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewModal from '../PreviewModal.jsx';
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

const createDesignOwnershipValue = (overrides = {}) => ({
  currentDesignId: 'preview-design',
  setCurrentDesignId: jest.fn(),
  ensureOwnership: jest.fn().mockResolvedValue(true),
  isDesignOwned: jest.fn().mockReturnValue(false),
  loading: false,
  error: null,
  ...overrides,
});

describe('PreviewModal', () => {
  beforeEach(() => {
    useModalFocusTrap.mockClear();
    useModalFocusTrap.mockImplementation(() => ({ current: null }));
    useDesignOwnership.mockReset();
    useDesignOwnership.mockReturnValue(createDesignOwnershipValue());
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
    expect(screen.getByText(/preview this design/i)).toBeInTheDocument();
  });

  it('invokes the provided callbacks when buttons are clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onUseDesign = jest.fn();

    render(<PreviewModal isOpen onClose={onClose} onUseDesign={onUseDesign} />);

    await user.click(screen.getByLabelText(/close preview/i));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /use this design/i }));
    expect(onUseDesign).toHaveBeenCalledWith({ designId: 'preview-design', owned: false });
  });

  it('updates the button label when the design is owned', () => {
    const ownershipValue = createDesignOwnershipValue({
      isDesignOwned: jest.fn().mockReturnValue(true),
      loading: false,
      currentDesignId: 'owned-design',
    });
    useDesignOwnership.mockReturnValue(ownershipValue);

    render(<PreviewModal isOpen designId="owned-design" onClose={() => {}} onUseDesign={() => {}} />);

    expect(screen.getByRole('button', { name: /edit this design/i })).toBeInTheDocument();
    expect(screen.getByText(/you already own this design/i)).toBeInTheDocument();
  });
});
