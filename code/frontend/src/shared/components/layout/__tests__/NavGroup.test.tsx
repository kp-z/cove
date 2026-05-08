import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../../../test/test-utils';
import { NavGroup } from '../../ui/NavGroup';
import { BookOpen, Users, Terminal } from 'lucide-react';

const mockItem = {
  name: 'Library',
  path: '/library',
  icon: BookOpen,
  id: 'library',
  subItems: [
    { name: 'Agents', path: '/agents', icon: Users },
    { name: 'Terminal', path: '/terminal', icon: Terminal },
  ],
};

describe('NavGroup', () => {
  it('renders group name when not collapsed', () => {
    renderWithRouter(
      <NavGroup
        item={mockItem}
        collapsed={false}
        isExpanded={false}
        onToggle={() => {}}
        menuState="inactive"
      />,
      { route: '/other' }
    );
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('shows sub-items when expanded', () => {
    renderWithRouter(
      <NavGroup
        item={mockItem}
        collapsed={false}
        isExpanded={true}
        onToggle={() => {}}
        menuState="inactive"
      />,
      { route: '/other' }
    );
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Terminal')).toBeInTheDocument();
  });

  it('hides sub-items when collapsed', () => {
    renderWithRouter(
      <NavGroup
        item={mockItem}
        collapsed={false}
        isExpanded={false}
        onToggle={() => {}}
        menuState="inactive"
      />,
      { route: '/other' }
    );
    expect(screen.queryByText('Agents')).not.toBeInTheDocument();
  });

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup();
    let toggled = false;
    renderWithRouter(
      <NavGroup
        item={mockItem}
        collapsed={false}
        isExpanded={false}
        onToggle={() => { toggled = true; }}
        menuState="inactive"
      />,
      { route: '/other' }
    );

    await user.click(screen.getByText('Library'));
    expect(toggled).toBe(true);
  });

  it('applies partial style when a child is active', () => {
    renderWithRouter(
      <NavGroup
        item={mockItem}
        collapsed={false}
        isExpanded={false}
        onToggle={() => {}}
        menuState="partial"
      />,
      { route: '/agents' }
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-blue-600/10');
  });

  it('applies active style for direct active state', () => {
    renderWithRouter(
      <NavGroup
        item={mockItem}
        collapsed={false}
        isExpanded={false}
        onToggle={() => {}}
        menuState="active"
      />,
      { route: '/library' }
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-blue-600/30');
  });
});
