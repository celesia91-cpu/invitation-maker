import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('next/document', () => {
  const React = require('react');

  const Html = ({ children, ...props }) => React.createElement('html', props, children);
  const Head = ({ children, ...props }) => React.createElement('head', props, children);
  const Main = ({ children, ...props }) => React.createElement('main', props, children);
  const NextScript = ({ children, ...props }) => React.createElement('script', props, children);

  class Document {}

  return {
    __esModule: true,
    default: Document,
    Html,
    Head,
    Main,
    NextScript,
  };
});

// Import after mocking next/document so MyDocument uses the stub components.
import MyDocument from '../_document';

describe('MyDocument', () => {
  it('renders the expected HTML attributes and head tags', () => {
    const document = new MyDocument();
    const markup = renderToStaticMarkup(document.render());

    expect(markup).toContain('lang="en"');
    expect(markup).toContain('class="h-full"');

    [
      '<meta name="apple-mobile-web-app-capable" content="yes"/>',
      '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>',
      '<meta name="mobile-web-app-capable" content="yes"/>',
      '<meta name="theme-color" content="#0f1021"/>',
    ].forEach((meta) => {
      expect(markup).toContain(meta);
    });

    expect(markup).toContain(
      '<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&amp;family=Pacifico&amp;family=Shadows+Into+Light&amp;display=swap" rel="stylesheet"/>'
    );
  });
});
