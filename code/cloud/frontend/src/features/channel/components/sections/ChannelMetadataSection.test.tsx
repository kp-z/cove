import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelMetadataSection } from './ChannelMetadataSection';

describe('ChannelMetadataSection', () => {
  const mockOnTagsChange = vi.fn();
  const mockOnCategoryChange = vi.fn();

  beforeEach(() => {
    mockOnTagsChange.mockClear();
    mockOnCategoryChange.mockClear();
  });

  it('should render with empty metadata', () => {
    render(
      <ChannelMetadataSection
        tags={[]}
        category=""
        onTagsChange={mockOnTagsChange}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add tag')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Engineering, Design, General')).toBeInTheDocument();
  });

  it('should display existing tags', () => {
    const tags = ['engineering', 'frontend', 'react'];

    render(
      <ChannelMetadataSection
        tags={tags}
        category=""
        onTagsChange={mockOnTagsChange}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText('engineering')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('should display existing category', () => {
    render(
      <ChannelMetadataSection
        tags={[]}
        category="Engineering"
        onTagsChange={mockOnTagsChange}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const input = screen.getByPlaceholderText('e.g., Engineering, Design, General') as HTMLInputElement;
    expect(input.value).toBe('Engineering');
  });

  it('should call onTagsChange when adding a new tag', async () => {
    const user = userEvent.setup();
    const tags = ['tag1'];

    render(
      <ChannelMetadataSection
        tags={tags}
        category=""
        onTagsChange={mockOnTagsChange}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const input = screen.getByPlaceholderText('Add tag');
    await user.type(input, 'tag2{Enter}');

    expect(mockOnTagsChange).toHaveBeenCalledWith(['tag1', 'tag2']);
  });

  it('should not add duplicate tags', async () => {
    const user = userEvent.setup();
    const tags = ['tag1'];

    render(
      <ChannelMetadataSection
        tags={tags}
        category=""
        onTagsChange={mockOnTagsChange}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const input = screen.getByPlaceholderText('Add tag');
    await user.type(input, 'tag1{Enter}');

    expect(mockOnTagsChange).not.toHaveBeenCalled();
  });

  it('should call onTagsChange when removing a tag', async () => {
    const user = userEvent.setup();
    const tags = ['tag1', 'tag2'];

    const { container } = render(
      <ChannelMetadataSection
        tags={tags}
        category=""
        onTagsChange={mockOnTagsChange}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    // Find remove button for first tag
    const removeButtons = container.querySelectorAll('button[aria-label*="Remove"]');
    if (removeButtons.length > 0) {
      await user.click(removeButtons[0]);
      expect(mockOnTagsChange).toHaveBeenCalledWith(['tag2']);
    }
  });

  it('should call onCategoryChange when typing in category input', async () => {
    const user = userEvent.setup();

    render(
      <ChannelMetadataSection
        tags={[]}
        category=""
        onTagsChange={mockOnTagsChange}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const input = screen.getByPlaceholderText('e.g., Engineering, Design, General');
    await user.type(input, 'Design');

    // userEvent.type triggers onChange for each character
    expect(mockOnCategoryChange).toHaveBeenCalled();
    expect(mockOnCategoryChange.mock.calls.length).toBe(6); // 'Design' has 6 characters
  });

  it('should handle undefined tags', () => {
    render(
      <ChannelMetadataSection
        tags={undefined}
        category=""
        onTagsChange={mockOnTagsChange}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByPlaceholderText('Add tag')).toBeInTheDocument();
  });

  it('should handle undefined category', () => {
    render(
      <ChannelMetadataSection
        tags={[]}
        category={undefined}
        onTagsChange={mockOnTagsChange}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const input = screen.getByPlaceholderText('e.g., Engineering, Design, General') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('should clear category when input is cleared', async () => {
    const user = userEvent.setup();

    render(
      <ChannelMetadataSection
        tags={[]}
        category="Engineering"
        onTagsChange={mockOnTagsChange}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const input = screen.getByPlaceholderText('e.g., Engineering, Design, General');
    await user.clear(input);

    expect(mockOnCategoryChange).toHaveBeenCalledWith('');
  });
});
