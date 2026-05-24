import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelBasicInfoSection } from './ChannelBasicInfoSection';

// Mock AvatarEditor component
vi.mock('@/shared/components/display/Avatar/AvatarEditor', () => ({
  AvatarEditor: ({ onAvatarChange }: { onAvatarChange: (avatar: any) => void }) => (
    <button onClick={() => onAvatarChange({ type: 'preset', value: 'avatar-1' })}>
      Mock Avatar Editor
    </button>
  ),
}));

describe('ChannelBasicInfoSection', () => {
  const mockProps = {
    name: 'general',
    displayName: 'General Chat',
    description: 'A place for general discussions',
    icon: '💬',
    avatar: undefined,
    type: 'public' as const,
    status: 'active' as const,
    parentChannelId: undefined,
    onNameChange: vi.fn(),
    onDisplayNameChange: vi.fn(),
    onDescriptionChange: vi.fn(),
    onIconChange: vi.fn(),
    onAvatarChange: vi.fn(),
    onTypeChange: vi.fn(),
    onStatusChange: vi.fn(),
    onParentChannelIdChange: vi.fn(),
    isCreateMode: true,
    channelId: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all basic info fields', () => {
    render(<ChannelBasicInfoSection {...mockProps} />);

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByDisplayValue('general')).toBeInTheDocument();
    expect(screen.getByDisplayValue('General Chat')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A place for general discussions')).toBeInTheDocument();
    expect(screen.getByDisplayValue('💬')).toBeInTheDocument();
  });

  it('should render avatar editor', () => {
    render(<ChannelBasicInfoSection {...mockProps} />);

    expect(screen.getByText('Mock Avatar Editor')).toBeInTheDocument();
  });

  it('should call onNameChange when name input changes', async () => {
    const user = userEvent.setup();

    render(<ChannelBasicInfoSection {...mockProps} />);

    const nameInput = screen.getByDisplayValue('general');
    await user.clear(nameInput);
    await user.type(nameInput, 'new-channel');

    expect(mockProps.onNameChange).toHaveBeenCalled();
  });

  it('should call onDisplayNameChange when display name input changes', async () => {
    const user = userEvent.setup();

    render(<ChannelBasicInfoSection {...mockProps} />);

    const displayNameInput = screen.getByDisplayValue('General Chat');
    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'New Channel');

    expect(mockProps.onDisplayNameChange).toHaveBeenCalled();
  });

  it('should call onDescriptionChange when description changes', async () => {
    const user = userEvent.setup();

    render(<ChannelBasicInfoSection {...mockProps} />);

    const descriptionInput = screen.getByDisplayValue('A place for general discussions');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'New description');

    expect(mockProps.onDescriptionChange).toHaveBeenCalled();
  });

  it('should call onIconChange when icon input changes', async () => {
    const user = userEvent.setup();

    render(<ChannelBasicInfoSection {...mockProps} />);

    const iconInput = screen.getByDisplayValue('💬');
    await user.clear(iconInput);
    await user.type(iconInput, '🎉');

    expect(mockProps.onIconChange).toHaveBeenCalled();
  });

  it('should call onAvatarChange when avatar is changed', async () => {
    const user = userEvent.setup();

    render(<ChannelBasicInfoSection {...mockProps} />);

    const avatarButton = screen.getByText('Mock Avatar Editor');
    await user.click(avatarButton);

    expect(mockProps.onAvatarChange).toHaveBeenCalledWith({
      type: 'preset',
      value: 'avatar-1',
    });
  });

  it('should disable name input in edit mode', () => {
    render(<ChannelBasicInfoSection {...mockProps} isCreateMode={false} />);

    const nameInput = screen.getByDisplayValue('general');
    expect(nameInput).toBeDisabled();
  });

  it('should enable name input in create mode', () => {
    render(<ChannelBasicInfoSection {...mockProps} isCreateMode={true} />);

    const nameInput = screen.getByDisplayValue('general');
    expect(nameInput).not.toBeDisabled();
  });

  it('should render type selector with correct options', () => {
    render(<ChannelBasicInfoSection {...mockProps} />);

    // Find the type select by its role
    const selects = screen.getAllByRole('combobox');
    const typeSelect = selects.find(select =>
      (select as HTMLSelectElement).value === 'public'
    );
    expect(typeSelect).toBeDefined();
  });

  it('should call onTypeChange when type is changed', async () => {
    const user = userEvent.setup();

    render(<ChannelBasicInfoSection {...mockProps} />);

    // Find the type select by its role
    const selects = screen.getAllByRole('combobox');
    const typeSelect = selects.find(select =>
      (select as HTMLSelectElement).value === 'public'
    );
    expect(typeSelect).toBeDefined();

    if (typeSelect) {
      await user.selectOptions(typeSelect, 'private');
      expect(mockProps.onTypeChange).toHaveBeenCalledWith('private');
    }
  });

  it('should not render status field in create mode', () => {
    render(<ChannelBasicInfoSection {...mockProps} isCreateMode={true} />);

    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('should render status field in edit mode', () => {
    render(<ChannelBasicInfoSection {...mockProps} isCreateMode={false} />);

    expect(screen.getByText('Status')).toBeInTheDocument();
    // Find the select element by its role
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects.find(select =>
      (select as HTMLSelectElement).value === 'active'
    );
    expect(statusSelect).toBeDefined();
  });

  it('should call onStatusChange when status is changed', async () => {
    const user = userEvent.setup();

    render(<ChannelBasicInfoSection {...mockProps} isCreateMode={false} />);

    // Find the status select by label
    const statusLabel = screen.getByText('Status');
    const statusSelect = statusLabel.closest('.space-y-2')?.querySelector('select');
    expect(statusSelect).toBeDefined();

    if (statusSelect) {
      await user.selectOptions(statusSelect, 'archived');
      expect(mockProps.onStatusChange).toHaveBeenCalledWith('archived');
    }
  });

  it('should render parent channel field when callback is provided', () => {
    render(<ChannelBasicInfoSection {...mockProps} />);

    expect(screen.getByText('Parent Channel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('parent-channel-id')).toBeInTheDocument();
  });

  it('should call onParentChannelIdChange when parent channel input changes', async () => {
    const user = userEvent.setup();

    render(<ChannelBasicInfoSection {...mockProps} />);

    const parentInput = screen.getByPlaceholderText('parent-channel-id');
    await user.type(parentInput, 'parent-123');

    expect(mockProps.onParentChannelIdChange).toHaveBeenCalled();
  });

  it('should not render parent channel field when callback is not provided', () => {
    const propsWithoutParent = {
      ...mockProps,
      onParentChannelIdChange: undefined,
    };

    render(<ChannelBasicInfoSection {...propsWithoutParent} />);

    expect(screen.queryByText('Parent Channel')).not.toBeInTheDocument();
  });

  it('should display existing parent channel ID', () => {
    render(<ChannelBasicInfoSection {...mockProps} parentChannelId="parent-123" />);

    const parentInput = screen.getByPlaceholderText('parent-channel-id') as HTMLInputElement;
    expect(parentInput.value).toBe('parent-123');
  });

  it('should handle avatar prop correctly', () => {
    const avatar = { type: 'preset' as const, value: 'avatar-1' };
    render(<ChannelBasicInfoSection {...mockProps} avatar={avatar} />);

    expect(screen.getByText('Mock Avatar Editor')).toBeInTheDocument();
  });
});
