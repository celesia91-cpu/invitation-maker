const { TextDecoder, TextEncoder } = require('util');
require('@testing-library/jest-dom');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

if (typeof window !== 'undefined') {
  if (typeof window.prompt !== 'function') {
    Object.defineProperty(window, 'prompt', {
      configurable: true,
      value: jest.fn(),
      writable: true,
    });
  } else {
    window.prompt = jest.fn(window.prompt);
  }
}

if (typeof navigator !== 'undefined') {
  const mockClipboard = navigator.clipboard || {};

  if (typeof mockClipboard.writeText !== 'function') {
    mockClipboard.writeText = jest.fn().mockResolvedValue(undefined);
  } else {
    mockClipboard.writeText = jest.fn(mockClipboard.writeText);
  }

  if (typeof mockClipboard.readText !== 'function') {
    mockClipboard.readText = jest.fn().mockResolvedValue('');
  } else {
    mockClipboard.readText = jest.fn(mockClipboard.readText);
  }

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: mockClipboard,
  });
}

if (typeof global.PointerEvent === 'undefined') {
  const BaseMouseEvent = typeof MouseEvent !== 'undefined'
    ? MouseEvent
    : class MockMouseEvent {
        constructor(type, params = {}) {
          this.type = type;
          this.bubbles = params.bubbles ?? false;
          this.cancelable = params.cancelable ?? false;
        }
      };

  class MockPointerEvent extends BaseMouseEvent {
    constructor(type, params = {}) {
      super(type, params);

      this.pointerId = params.pointerId ?? 1;
      this.width = params.width ?? 0;
      this.height = params.height ?? 0;
      this.pressure = params.pressure ?? 0;
      this.tangentialPressure = params.tangentialPressure ?? 0;
      this.tiltX = params.tiltX ?? 0;
      this.tiltY = params.tiltY ?? 0;
      this.twist = params.twist ?? 0;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? true;
    }
  }

  global.PointerEvent = MockPointerEvent;

  if (typeof window !== 'undefined') {
    window.PointerEvent = MockPointerEvent;
  }
}

if (typeof Element !== 'undefined') {
  const elementPrototype = Element.prototype;

  if (typeof elementPrototype.setPointerCapture !== 'function') {
    Object.defineProperty(elementPrototype, 'setPointerCapture', {
      configurable: true,
      value: () => {},
      writable: true,
    });
  }

  if (typeof elementPrototype.releasePointerCapture !== 'function') {
    Object.defineProperty(elementPrototype, 'releasePointerCapture', {
      configurable: true,
      value: () => {},
      writable: true,
    });
  }
}
