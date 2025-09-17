import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidePanel from '../SidePanel.jsx';

const PANEL_GROUPS = [
  { name: 'slides', label: 'Slides' },
  { name: 'text', label: 'Text' },
  { name: 'image', label: 'Image' },
  { name: 'presets', label: 'Presets' },
  { name: 'event', label: 'Event' },
];

describe('SidePanel', () => {
  it('renders each panel group expanded with connected aria attributes', () => {
    render(<SidePanel />);

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
    render(<SidePanel />);

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
    render(<SidePanel />);

    const slidesSection = screen.getByLabelText('Slides', { selector: 'section' });
    const addSlideButton = within(slidesSection).getByRole('button', { name: 'Add' });
    expect(addSlideButton).toHaveAttribute('id', 'addSlideBtn');

    const fontSizeSlider = screen.getByLabelText('Font Size');
    expect(fontSizeSlider).toHaveAttribute('id', 'fontSize');

    const imageSection = screen.getByLabelText('Image', { selector: 'section' });
    const fadeInButton = within(imageSection).getByRole('button', { name: 'Fade In' });
    expect(fadeInButton).toHaveAttribute('id', 'imgFadeInBtn');
  });
});
