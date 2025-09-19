import { render, screen, waitFor, act } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import MyApp from '../_app.jsx';
import { useAppState } from '../../context/AppStateContext.jsx';
import { createMockRouter, emitRouteChange } from '../../test/utils/createMockRouter.js';

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
    const router = createMockRouter({ asPath: '/welcome', pathname: '/welcome' });

    render(
      <RouterContext.Provider value={router}>
        <MyApp Component={DummyComponent} pageProps={pageProps} />
      </RouterContext.Provider>
    );

    expect(screen.getByTestId('dummy-component')).toBeInTheDocument();
    expect(recordedProps).toEqual(pageProps);
    expect(recordedContext).toBeDefined();
    expect(typeof recordedContext.setSlides).toBe('function');
    expect(recordedContext.userRole).toBe('guest');
    expect(typeof recordedContext.setUserRole).toBe('function');
    expect(typeof recordedContext.resetUserRole).toBe('function');
  });

  it('seeds and updates navigation history based on router events', async () => {
    const pageProps = { message: 'history test' };
    const router = createMockRouter({ asPath: '/initial', pathname: '/initial' });

    render(
      <RouterContext.Provider value={router}>
        <MyApp Component={DummyComponent} pageProps={pageProps} />
      </RouterContext.Provider>
    );

    await waitFor(() => {
      expect(recordedContext.navigationHistory).toEqual([
        { href: '/initial', label: 'Initial' },
      ]);
    });

    await act(async () => {
      router.asPath = '/initial/invite';
      emitRouteChange(router, '/initial/invite');
    });

    await waitFor(() => {
      expect(recordedContext.navigationHistory).toEqual([
        { href: '/initial', label: 'Initial' },
        { href: '/initial/invite', label: 'Invite' },
      ]);
    });
  });
});
