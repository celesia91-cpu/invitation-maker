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
