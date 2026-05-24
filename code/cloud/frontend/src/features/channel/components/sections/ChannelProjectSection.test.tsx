import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelProjectSection } from './ChannelProjectSection';

describe('ChannelProjectSection', () => {
  const mockOnProjectIdChange = vi.fn();

  beforeEach(() => {
    mockOnProjectIdChange.mockClear();
  });

  it('should render with empty project ID', () => {
    render(
      <ChannelProjectSection
        projectId=""
        onProjectIdChange={mockOnProjectIdChange}
      />
    );

    expect(screen.getByText('Project Association')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('project-id')).toBeInTheDocument();
  });

  it('should display existing project ID', () => {
    render(
      <ChannelProjectSection
        projectId="project-123"
        onProjectIdChange={mockOnProjectIdChange}
      />
    );

    const input = screen.getByPlaceholderText('project-id') as HTMLInputElement;
    expect(input.value).toBe('project-123');
  });

  it('should call onProjectIdChange when typing', async () => {
    const user = userEvent.setup();

    render(
      <ChannelProjectSection
        projectId=""
        onProjectIdChange={mockOnProjectIdChange}
      />
    );

    const input = screen.getByPlaceholderText('project-id');
    await user.type(input, 'new-project');

    // userEvent.type triggers onChange for each character
    expect(mockOnProjectIdChange).toHaveBeenCalled();
    expect(mockOnProjectIdChange.mock.calls.length).toBe(11); // 'new-project' has 11 characters
  });

  it('should handle undefined project ID', () => {
    render(
      <ChannelProjectSection
        projectId={undefined}
        onProjectIdChange={mockOnProjectIdChange}
      />
    );

    const input = screen.getByPlaceholderText('project-id') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('should clear project ID when input is cleared', async () => {
    const user = userEvent.setup();

    render(
      <ChannelProjectSection
        projectId="project-123"
        onProjectIdChange={mockOnProjectIdChange}
      />
    );

    const input = screen.getByPlaceholderText('project-id');
    await user.clear(input);

    expect(mockOnProjectIdChange).toHaveBeenCalledWith('');
  });
});
