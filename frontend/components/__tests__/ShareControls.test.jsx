import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareControls from '../ShareControls';

describe('ShareControls', () => {
  const originalClipboard = navigator.clipboard;
  const originalWriteText = originalClipboard?.writeText;

  afterEach(() => {
    if (originalClipboard) {
      originalClipboard.writeText = originalWriteText;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
        writable: true,
      });
    } else {
      delete navigator.clipboard;
    }
  });

  it('copies the typed link to the clipboard when clicking Copy', async () => {
    const clipboard = navigator.clipboard ?? {};
    const writeTextMock = jest.fn().mockResolvedValue(undefined);

    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: clipboard,
        writable: true,
      });
    }

    clipboard.writeText = writeTextMock;

    const user = userEvent.setup();
    render(<ShareControls />);

    // Ensure the mock remains active if render altered the clipboard reference.
    navigator.clipboard.writeText = writeTextMock;

    const input = screen.getByPlaceholderText(/share link/i);
    const typedValue = 'https://example.com/invite';
    await user.type(input, typedValue);

    expect(input).toHaveValue(typedValue);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith(typedValue);
  });
});
