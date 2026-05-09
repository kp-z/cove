import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../../../test/test-utils';
import { UserSection } from './UserSection';

describe('UserSection', () => {
  it('renders user avatar', () => {
    renderWithRouter(<UserSection collapsed={false} />);
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('user@cove.ai')).toBeInTheDocument();
  });

  it('hides text when collapsed', () => {
    renderWithRouter(<UserSection collapsed={true} />);
    expect(screen.queryByText('User')).not.toBeInTheDocument();
    expect(screen.queryByText('user@cove.ai')).not.toBeInTheDocument();
  });
});
