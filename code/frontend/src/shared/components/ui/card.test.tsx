import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should have default size', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.querySelector('[data-slot="card"]');
      expect(card).toHaveAttribute('data-size', 'default');
    });

    it('should accept small size', () => {
      const { container } = render(<Card size="sm">Content</Card>);
      const card = container.querySelector('[data-slot="card"]');
      expect(card).toHaveAttribute('data-size', 'sm');
    });

    it('should accept custom className', () => {
      render(<Card className="custom-class">Content</Card>);
      const card = screen.getByText('Content');
      expect(card).toHaveClass('custom-class');
    });

    it('should have data-slot attribute', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('should render children', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should have data-slot attribute', () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const header = container.querySelector('[data-slot="card-header"]');
      expect(header).toBeInTheDocument();
    });

    it('should accept custom className', () => {
      render(<CardHeader className="custom-class">Header</CardHeader>);
      const header = screen.getByText('Header');
      expect(header).toHaveClass('custom-class');
    });
  });

  describe('CardTitle', () => {
    it('should render children', () => {
      render(<CardTitle>Title Text</CardTitle>);
      expect(screen.getByText('Title Text')).toBeInTheDocument();
    });

    it('should have data-slot attribute', () => {
      const { container } = render(<CardTitle>Title</CardTitle>);
      const title = container.querySelector('[data-slot="card-title"]');
      expect(title).toBeInTheDocument();
    });

    it('should have font styling', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByText('Title');
      expect(title).toHaveClass('font-medium');
      expect(title).toHaveClass('text-base');
    });
  });

  describe('CardDescription', () => {
    it('should render children', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should have data-slot attribute', () => {
      const { container } = render(<CardDescription>Description</CardDescription>);
      const description = container.querySelector('[data-slot="card-description"]');
      expect(description).toBeInTheDocument();
    });

    it('should have muted text color', () => {
      render(<CardDescription>Description</CardDescription>);
      const description = screen.getByText('Description');
      expect(description).toHaveClass('text-muted-foreground');
    });
  });

  describe('CardAction', () => {
    it('should render children', () => {
      render(<CardAction>Action Button</CardAction>);
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should have data-slot attribute', () => {
      const { container } = render(<CardAction>Action</CardAction>);
      const action = container.querySelector('[data-slot="card-action"]');
      expect(action).toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('should render children', () => {
      render(<CardContent>Content text</CardContent>);
      expect(screen.getByText('Content text')).toBeInTheDocument();
    });

    it('should have data-slot attribute', () => {
      const { container } = render(<CardContent>Content</CardContent>);
      const content = container.querySelector('[data-slot="card-content"]');
      expect(content).toBeInTheDocument();
    });

    it('should have padding', () => {
      render(<CardContent>Content</CardContent>);
      const content = screen.getByText('Content');
      expect(content).toHaveClass('px-4');
    });
  });

  describe('CardFooter', () => {
    it('should render children', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should have data-slot attribute', () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.querySelector('[data-slot="card-footer"]');
      expect(footer).toBeInTheDocument();
    });

    it('should have border and background', () => {
      render(<CardFooter>Footer</CardFooter>);
      const footer = screen.getByText('Footer');
      expect(footer).toHaveClass('border-t');
      expect(footer).toHaveClass('bg-muted/50');
    });
  });

  describe('Card Composition', () => {
    it('should render complete card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
            <CardAction>Action</CardAction>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
      expect(screen.getByText('Card Footer')).toBeInTheDocument();
    });
  });
});
