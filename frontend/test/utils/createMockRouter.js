import { EventEmitter } from 'events';

export function createMockRouter(overrides = {}) {
  const eventEmitter = new EventEmitter();

  const router = {
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    basePath: '',
    isLocaleDomain: false,
    isReady: true,
    isPreview: false,
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: eventEmitter.on.bind(eventEmitter),
      off: eventEmitter.off.bind(eventEmitter),
      emit: eventEmitter.emit.bind(eventEmitter),
    },
    ...overrides,
  };

  return router;
}

export function emitRouteChange(router, url) {
  if (router?.events?.emit) {
    router.events.emit('routeChangeComplete', url);
  }
}
