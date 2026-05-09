import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../../../test/test-utils';
import { Navigation } from './Navigation';

describe('Navigation', () => {
  it('renders all top-level nav items', () => {
    renderWithRouter(<Navigation collapsed={false} />, { route: '/' });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Automation')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('renders navigation element', () => {
    renderWithRouter(<Navigation collapsed={false} />, { route: '/' });
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('auto-expands group with active child', () => {
    renderWithRouter(<Navigation collapsed={false} />, { route: '/agents' });
    expect(screen.getByText('Agents')).toBeInTheDocument();
  });

  it('auto-expands automation when on workflow page', () => {
    renderWithRouter(<Navigation collapsed={false} />, { route: '/workflows' });
    expect(screen.getByText('Workflows')).toBeInTheDocument();
  });
});
