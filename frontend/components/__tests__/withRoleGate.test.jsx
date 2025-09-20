import { render, screen } from '@testing-library/react';
import withRoleGate from '../withRoleGate.jsx';
import { useAppState } from '../../context/AppStateContext.jsx';

jest.mock('../../context/AppStateContext.jsx', () => ({
  useAppState: jest.fn(),
}));

function BaseComponent({ label }) {
  return <div>{label}</div>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('withRoleGate', () => {
  it('renders the wrapped component when the user role is allowed (case-insensitive match)', () => {
    const AllowedComponent = withRoleGate(BaseComponent, {
      allowedRoles: ['ADMIN'],
    });
    useAppState.mockReturnValue({ userRole: ' Admin ' });

    render(<AllowedComponent label="Allowed content" />);

    expect(screen.getByText('Allowed content')).toBeInTheDocument();
  });

  it('renders the fallback component and receives props when the role is blocked', () => {
    function FallbackComponent({ userRole, message }) {
      return (
        <div>
          {message} ({userRole})
        </div>
      );
    }

    const BlockedComponent = withRoleGate(BaseComponent, {
      allowedRoles: ['creator'],
      fallback: FallbackComponent,
    });

    useAppState.mockReturnValue({ userRole: 'guest' });

    render(<BlockedComponent label="Hidden" message="Upgrade required" />);

    expect(screen.getByText('Upgrade required (guest)')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders the fallback element when provided instead of a component', () => {
    const BlockedComponent = withRoleGate(BaseComponent, {
      allowedRoles: ['consumer'],
      fallback: <div data-testid="fallback-node">No access</div>,
    });

    useAppState.mockReturnValue({ userRole: 'guest' });

    render(<BlockedComponent label="Hidden" />);

    expect(screen.getByTestId('fallback-node')).toHaveTextContent('No access');
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders nothing when the role is blocked and no fallback is provided', () => {
    const BlockedComponent = withRoleGate(BaseComponent, {
      allowedRoles: ['admin'],
    });

    useAppState.mockReturnValue({ userRole: 'guest' });

    const { container } = render(<BlockedComponent label="Hidden" />);

    expect(container).toBeEmptyDOMElement();
  });
});
