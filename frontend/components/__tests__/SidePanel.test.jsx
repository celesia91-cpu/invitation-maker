import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidePanel from '../SidePanel.jsx';
import { MockAppStateProvider } from '../../context/AppStateContext.jsx';

const PANEL_GROUPS = [
  { name: 'slides', label: 'Slides' },
  { name: 'text', label: 'Text' },
  { name: 'image', label: 'Image' },
  { name: 'presets', label: 'Presets' },
  { name: 'event', label: 'Event' },
];

function renderPanel(role = 'creator') {
  return render(
    <MockAppStateProvider value={{ userRole: role }}>
      <SidePanel />
    </MockAppStateProvider>
  );
}

describe('SidePanel', () => {
  it('renders each panel group expanded with connected aria attributes', () => {
    renderPanel();

    PANEL_GROUPS.forEach(({ name, label }) => {
      const section = screen.getByLabelText(label, { selector: 'section' });
      const toggle = within(section).getByRole('button', { name: label });
      const region = within(section).getByRole('region', { name: label });

      expect(section).not.toHaveAttribute('data-collapsed');
      expect(section).toHaveAttribute('data-group', name);

      expect(toggle).toHaveAttribute('id', `${name}-toggle`);
      expect(toggle).toHaveAttribute('aria-controls', `${name}-content`);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');

      expect(region).toHaveAttribute('id', `${name}-content`);
      expect(region).toHaveAttribute('aria-labelledby', `${name}-toggle`);
      expect(region).toHaveAttribute('aria-hidden', 'false');
    });
  });

  it('collapses and expands groups when their toggles are clicked', async () => {
    const user = userEvent.setup();
    renderPanel();

    for (const { name, label } of PANEL_GROUPS) {
      const section = screen.getByLabelText(label, { selector: 'section' });
      const toggle = within(section).getByRole('button', { name: label });
      const region = within(section).getByRole('region', { name: label });

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(section).toHaveAttribute('data-collapsed', 'true');
      expect(section).toHaveClass('collapsed');
      expect(region).toHaveAttribute('aria-hidden', 'true');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(section).not.toHaveAttribute('data-collapsed');
      expect(section).not.toHaveClass('collapsed');
      expect(region).toHaveAttribute('aria-hidden', 'false');
    }
  });

  it('exposes key control ids so downstream selectors remain stable', () => {
    renderPanel();

    const slidesSection = screen.getByLabelText('Slides', { selector: 'section' });
    const addSlideButton = within(slidesSection).getByRole('button', { name: 'Add' });
    expect(addSlideButton).toHaveAttribute('id', 'addSlideBtn');

    const fontSizeSlider = screen.getByLabelText('Font Size');
    expect(fontSizeSlider).toHaveAttribute('id', 'fontSize');

    const imageSection = screen.getByLabelText('Image', { selector: 'section' });
    const fadeInButton = within(imageSection).getByRole('button', { name: 'Fade In' });
    expect(fadeInButton).toHaveAttribute('id', 'imgFadeInBtn');
  });

  it('disables editing controls for non-creator roles', () => {
    renderPanel('consumer');

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Add Text' })).toBeDisabled();
    expect(screen.getByLabelText('Font Size')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open' })).toBeDisabled();
    expect(screen.getByText(/editing is disabled/i)).toHaveTextContent('consumer');
  });
});
