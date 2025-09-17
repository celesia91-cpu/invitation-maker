import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Marketplace from '../Marketplace.jsx';

describe('Marketplace', () => {
  it('toggles the hidden class on the root element when isOpen changes', () => {
    const { container, rerender } = render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    const openRoot = container.querySelector('#marketplacePage');
    expect(openRoot).toBeInTheDocument();
    expect(openRoot).not.toHaveClass('hidden');

    rerender(<Marketplace isOpen={false} onSkipToEditor={jest.fn()} />);
    const closedRoot = container.querySelector('#marketplacePage');
    expect(closedRoot).toHaveClass('hidden');

    rerender(<Marketplace isOpen onSkipToEditor={jest.fn()} />);
    const reopenedRoot = container.querySelector('#marketplacePage');
    expect(reopenedRoot).not.toHaveClass('hidden');
  });

  it('moves focus and updates aria-selected when navigating categories with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Marketplace isOpen onSkipToEditor={jest.fn()} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    tabs[0].focus();
    expect(tabs[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{ArrowUp}');
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{End}');
    const lastIndex = tabs.length - 1;
    expect(tabs[lastIndex]).toHaveFocus();
    expect(tabs[lastIndex]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{Home}');
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[lastIndex]).toHaveAttribute('aria-selected', 'false');
  });

  it('prevents navigation and triggers onSkipToEditor when the skip link is clicked', async () => {
    const user = userEvent.setup();
    const onSkipToEditor = jest.fn();

    render(<Marketplace isOpen onSkipToEditor={onSkipToEditor} />);

    const skipLink = screen.getByRole('link', { name: /skip to blank editor/i });
    const capturedEvents = [];
    skipLink.addEventListener('click', (event) => {
      capturedEvents.push(event);
    });

    await user.click(skipLink);

    expect(onSkipToEditor).toHaveBeenCalledTimes(1);
    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0].defaultPrevented).toBe(true);
  });
});
