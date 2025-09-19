import { render, screen } from '@testing-library/react';
import MyApp from '../_app.jsx';
import { useAppState } from '../../context/AppStateContext.jsx';

let recordedProps;
let recordedContext;

function DummyComponent(props) {
  recordedProps = props;
  recordedContext = useAppState();
  return <div data-testid="dummy-component">Dummy component</div>;
}

describe('MyApp', () => {
  beforeEach(() => {
    recordedProps = undefined;
    recordedContext = undefined;
  });

  it('renders the child component with provided props and app state context', () => {
    const pageProps = { message: 'hello world' };

    render(<MyApp Component={DummyComponent} pageProps={pageProps} />);

    expect(screen.getByTestId('dummy-component')).toBeInTheDocument();
    expect(recordedProps).toEqual(pageProps);
    expect(recordedContext).toBeDefined();
    expect(typeof recordedContext.setSlides).toBe('function');
  });
});
