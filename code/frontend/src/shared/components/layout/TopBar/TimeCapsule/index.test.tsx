import { render, screen } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { act } from 'react';
import { TimeCapsule } from './index';

describe('TimeCapsule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T10:30:45'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render current time in HH:MM format', () => {
    render(<TimeCapsule lang="en" />);
    expect(screen.getByText('10:30')).toBeInTheDocument();
  });

  it('should update time every minute', () => {
    render(<TimeCapsule lang="en" />);
    expect(screen.getByText('10:30')).toBeInTheDocument();

    // Advance to next minute boundary (15 seconds to 10:31:00)
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.getByText('10:31')).toBeInTheDocument();

    // Advance one more minute
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByText('10:32')).toBeInTheDocument();
  });

  it('should render clock icon', () => {
    render(<TimeCapsule lang="en" />);
    const container = screen.getByLabelText(/2026/);
    const clockIcon = container.querySelector('svg');
    expect(clockIcon).toBeInTheDocument();
  });

  it('should have proper aria-label with full date', () => {
    render(<TimeCapsule lang="en" />);
    const container = screen.getByLabelText(/May.*2026/i);
    expect(container).toBeInTheDocument();
  });

  it('should format time with leading zeros', () => {
    vi.setSystemTime(new Date('2026-05-09T09:05:03'));
    render(<TimeCapsule lang="en" />);
    expect(screen.getByText('09:05')).toBeInTheDocument();
  });

  it('should support English locale', () => {
    render(<TimeCapsule lang="en" />);
    const container = screen.getByLabelText(/May.*2026/i);
    expect(container).toBeInTheDocument();
    expect(container.getAttribute('aria-label')).toMatch(/May/);
  });
});
