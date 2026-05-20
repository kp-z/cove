import { describe, it, expect } from 'vitest';
import { navItems, type NavItem } from '../../core/config/navigation';

describe('navigation config', () => {
  it('exports navItems as a non-empty array', () => {
    expect(Array.isArray(navItems)).toBe(true);
    expect(navItems.length).toBeGreaterThan(0);
  });

  it('each top-level item has required fields', () => {
    navItems.forEach((item) => {
      expect(item.name).toBeTruthy();
      expect(item.path).toBeTruthy();
      expect(item.icon).toBeDefined();
    });
  });

  it('Dashboard is the first item with path /', () => {
    expect(navItems[0].name).toBe('Dashboard');
    expect(navItems[0].path).toBe('/');
  });

  it('Library has subItems', () => {
    const library = navItems.find((item) => item.name === 'Library');
    expect(library).toBeDefined();
    expect(library!.id).toBe('library');
    expect(library!.subItems).toBeDefined();
    expect(library!.subItems!.length).toBeGreaterThan(0);
  });

  it('Automation has subItems', () => {
    const automation = navItems.find((item) => item.name === 'Automation');
    expect(automation).toBeDefined();
    expect(automation!.id).toBe('automation');
    expect(automation!.subItems).toBeDefined();
    expect(automation!.subItems!.length).toBeGreaterThan(0);
  });

  it('subItems have required fields', () => {
    navItems.forEach((item) => {
      item.subItems?.forEach((sub: NavItem) => {
        expect(sub.name).toBeTruthy();
        expect(sub.path).toBeTruthy();
        expect(sub.icon).toBeDefined();
      });
    });
  });

  it('all paths start with /', () => {
    const allPaths: string[] = [];
    navItems.forEach((item) => {
      allPaths.push(item.path);
      item.subItems?.forEach((sub) => allPaths.push(sub.path));
    });
    allPaths.forEach((path) => {
      expect(path.startsWith('/')).toBe(true);
    });
  });

  it('no duplicate paths exist', () => {
    const allPaths: string[] = [];
    navItems.forEach((item) => {
      allPaths.push(item.path);
      item.subItems?.forEach((sub) => allPaths.push(sub.path));
    });
    const unique = new Set(allPaths);
    expect(unique.size).toBe(allPaths.length);
  });
});
