import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Composer } from './Composer';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'composer.placeholder': 'Type a message...',
        'composer.sendHint': `Press ${options?.modifier || 'Cmd'} + Enter to send`,
        'common:actions.send': 'Send',
      };
      return translations[key] || key;
    },
  }),
}));

describe('Composer', () => {
  const mockOnSend = vi.fn();
  const mockOnStop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render textarea and send button', () => {
    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should use custom placeholder when provided', () => {
    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
        placeholder="Custom placeholder"
      />
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('should update content when typing', async () => {
    const user = userEvent.setup();

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement;
    await user.type(textarea, 'Hello world');

    expect(textarea.value).toBe('Hello world');
  });

  it('should call onSend when send button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea, 'Test message');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    expect(mockOnSend).toHaveBeenCalledWith('Test message');
    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  it('should clear content after sending', async () => {
    const user = userEvent.setup();

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement;
    await user.type(textarea, 'Test message');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('should disable send button when content is empty', () => {
    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when content is not empty', async () => {
    const user = userEvent.setup();

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea, 'Test');

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).not.toBeDisabled();
  });

  it('should not send message with only whitespace', async () => {
    const user = userEvent.setup();

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea, '   ');

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('should send message with Cmd+Enter on Mac', async () => {
    const user = userEvent.setup();

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea, 'Test message');
    await user.keyboard('{Meta>}{Enter}{/Meta}');

    expect(mockOnSend).toHaveBeenCalledWith('Test message');
  });

  it('should send message with Ctrl+Enter', async () => {
    const user = userEvent.setup();

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea, 'Test message');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(mockOnSend).toHaveBeenCalledWith('Test message');
  });

  it('should show stop button when generating', () => {
    render(
      <Composer
        threadId="thread-123"
        isGenerating={true}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    // Find the stop button (the one with red styling)
    const buttons = screen.getAllByRole('button');
    const stopButton = buttons.find(btn => btn.className.includes('bg-red-500/20'));
    expect(stopButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument();
  });

  it('should call onStop when stop button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Composer
        threadId="thread-123"
        isGenerating={true}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    // Find the stop button (the one with red styling)
    const buttons = screen.getAllByRole('button');
    const stopButton = buttons.find(btn => btn.className.includes('bg-red-500/20')) as HTMLButtonElement;
    expect(stopButton).toBeDefined();

    await user.click(stopButton);

    expect(mockOnStop).toHaveBeenCalledTimes(1);
  });

  it('should disable textarea when generating', () => {
    render(
      <Composer
        threadId="thread-123"
        isGenerating={true}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('AI 正在回复...');
    expect(textarea).toBeDisabled();
  });

  it('should save draft to localStorage', async () => {
    const user = userEvent.setup();

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea, 'Draft message');

    await waitFor(() => {
      expect(localStorage.getItem('composer-draft-thread-123')).toBe('Draft message');
    });
  });

  it('should load draft from localStorage on mount', () => {
    localStorage.setItem('composer-draft-thread-123', 'Saved draft');

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Saved draft');
  });

  it('should remove draft from localStorage after sending', async () => {
    const user = userEvent.setup();

    localStorage.setItem('composer-draft-thread-123', 'Draft to send');

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(localStorage.getItem('composer-draft-thread-123')).toBeNull();
    });
  });

  it('should remove draft from localStorage when content is cleared', async () => {
    const user = userEvent.setup();

    render(
      <Composer
        threadId="thread-123"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea, 'Test');

    await waitFor(() => {
      expect(localStorage.getItem('composer-draft-thread-123')).toBe('Test');
    });

    await user.clear(textarea);

    await waitFor(() => {
      expect(localStorage.getItem('composer-draft-thread-123')).toBeNull();
    });
  });

  it('should use different draft keys for different threads', async () => {
    const user = userEvent.setup();

    const { unmount } = render(
      <Composer
        threadId="thread-1"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea1 = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea1, 'Draft 1');

    await waitFor(() => {
      expect(localStorage.getItem('composer-draft-thread-1')).toBe('Draft 1');
    });

    unmount();

    render(
      <Composer
        threadId="thread-2"
        isGenerating={false}
        onSend={mockOnSend}
        onStop={mockOnStop}
      />
    );

    const textarea2 = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea2, 'Draft 2');

    await waitFor(() => {
      expect(localStorage.getItem('composer-draft-thread-2')).toBe('Draft 2');
      expect(localStorage.getItem('composer-draft-thread-1')).toBe('Draft 1');
    });
  });
});
