import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar Component', () => {
  describe('with avatar URL', () => {
    it('should render image when avatarUrl is provided', () => {
      render(
        <Avatar
          avatarUrl="https://example.com/avatar.png"
          name="Test User"
          size="md"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
      expect(img).toHaveAttribute('alt', 'Test User');
    });

    it('should apply correct size classes', () => {
      const { container } = render(
        <Avatar
          avatarUrl="https://example.com/avatar.png"
          name="Test User"
          size="lg"
        />
      );

      const avatarDiv = container.firstChild as HTMLElement;
      expect(avatarDiv).toHaveClass('w-12', 'h-12', 'text-base');
    });
  });

  describe('without avatar URL (initials fallback)', () => {
    it('should render initials when avatarUrl is not provided', () => {
      render(<Avatar avatarUrl={null} name="Test User" size="md" />);

      expect(screen.getByText('TU')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should render initials for undefined avatarUrl', () => {
      render(<Avatar avatarUrl={undefined} name="John Doe" size="md" />);

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should handle single word names', () => {
      render(<Avatar avatarUrl={null} name="Agent" size="md" />);

      expect(screen.getByText('AG')).toBeInTheDocument();
    });

    it('should handle camelCase names', () => {
      render(<Avatar avatarUrl={null} name="TestAgent" size="md" />);

      expect(screen.getByText('TA')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should apply small size classes', () => {
      const { container } = render(
        <Avatar avatarUrl={null} name="Test" size="sm" />
      );

      const avatarDiv = container.firstChild as HTMLElement;
      expect(avatarDiv).toHaveClass('w-8', 'h-8', 'text-xs');
    });

    it('should apply medium size classes (default)', () => {
      const { container } = render(
        <Avatar avatarUrl={null} name="Test" />
      );

      const avatarDiv = container.firstChild as HTMLElement;
      expect(avatarDiv).toHaveClass('w-10', 'h-10', 'text-sm');
    });

    it('should apply large size classes', () => {
      const { container } = render(
        <Avatar avatarUrl={null} name="Test" size="lg" />
      );

      const avatarDiv = container.firstChild as HTMLElement;
      expect(avatarDiv).toHaveClass('w-12', 'h-12', 'text-base');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Avatar
          avatarUrl={null}
          name="Test"
          className="custom-class"
        />
      );

      const avatarDiv = container.firstChild as HTMLElement;
      expect(avatarDiv).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <Avatar
          avatarUrl={null}
          name="Test"
          className="mr-4"
        />
      );

      const avatarDiv = container.firstChild as HTMLElement;
      expect(avatarDiv).toHaveClass('mr-4', 'rounded-full', 'bg-gradient-to-br');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string avatarUrl', () => {
      render(<Avatar avatarUrl="" name="Test User" />);

      // Empty string is falsy, should show initials
      expect(screen.getByText('TU')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should handle special characters in name', () => {
      render(<Avatar avatarUrl={null} name="Test-Agent_123" />);

      expect(screen.getByText('TA')).toBeInTheDocument();
    });
  });
});
