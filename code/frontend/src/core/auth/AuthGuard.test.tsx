import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';
import { useAuthStore } from './authStore';

describe('AuthGuard', () => {
  beforeEach(() => {
    // Reset auth store before each test
    useAuthStore.setState({ isAuthenticated: false });
  });

  it('should render children when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true });

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should render children when not authenticated (framework mode)', () => {
    useAuthStore.setState({ isAuthenticated: false });

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    );

    // In framework mode, content is always accessible
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should render multiple children', () => {
    useAuthStore.setState({ isAuthenticated: true });

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>First Child</div>
          <div>Second Child</div>
          <div>Third Child</div>
        </AuthGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('First Child')).toBeInTheDocument();
    expect(screen.getByText('Second Child')).toBeInTheDocument();
    expect(screen.getByText('Third Child')).toBeInTheDocument();
  });

  it('should render nested components', () => {
    useAuthStore.setState({ isAuthenticated: true });

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>
            <h1>Title</h1>
            <p>Description</p>
            <button>Action</button>
          </div>
        </AuthGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('should preserve component structure', () => {
    useAuthStore.setState({ isAuthenticated: true });

    const TestComponent = () => (
      <div data-testid="test-component">
        <span>Test</span>
      </div>
    );

    render(
      <MemoryRouter>
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      </MemoryRouter>
    );

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
