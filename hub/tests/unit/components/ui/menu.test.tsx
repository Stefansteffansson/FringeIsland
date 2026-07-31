import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu, type MenuEntry } from '@/components/ui/Menu';

/**
 * COR-C W5 (Audit III AC3-17) — the Hub's first shared INTERACTIVE primitive:
 * a WAI-ARIA-APG menu button. RED at HEAD: the component does not exist; the
 * Hub's two hand-rolled menus carry inverted ARIA (the bell declared a menu
 * it isn't; AccountMenu promised a menu it never rendered) and neither is
 * keyboard-navigable beyond raw Tab.
 */

const items: MenuEntry[] = [
  { key: 'one', label: 'First', href: '/one' },
  { key: 'two', label: 'Second', href: '/two' },
  { key: 'three', label: 'Third', onSelect: jest.fn() },
];

function renderMenu() {
  return render(
    <Menu
      buttonContent={<span>Open me</span>}
      buttonAriaLabel="Example menu"
      menuLabel="Example menu"
      items={items}
    />,
  );
}

describe('Menu — the shared menu-button primitive (COR-C W5, AC3-17)', () => {
  it('the closed trigger declares the menu-button contract', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Example menu' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opening renders a real menu: role=menu with menuitem children, first item focused', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'Example menu' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(3);
    expect(menuItems[0]).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Example menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('arrow keys rove with wrap; Home and End jump', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'Example menu' }));
    const menuItems = screen.getAllByRole('menuitem');

    await user.keyboard('{ArrowDown}');
    expect(menuItems[1]).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(menuItems[0]).toHaveFocus(); // wrapped
    await user.keyboard('{ArrowUp}');
    expect(menuItems[2]).toHaveFocus(); // wrapped back
    await user.keyboard('{Home}');
    expect(menuItems[0]).toHaveFocus();
    await user.keyboard('{End}');
    expect(menuItems[2]).toHaveFocus();
  });

  it('Escape closes the menu and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Example menu' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('selecting an action item runs it and closes the menu', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'Example menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Third' }));
    expect(items[2].onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
