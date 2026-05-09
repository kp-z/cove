import { render, screen } from '@testing-library/react';
import { TimeCapsule } from './index';

describe('TimeCapsule', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-09T10:30:45'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render current time in HH:MM:SS format', () => {
    render(<TimeCapsule lang="zh" />);
    expect(screen.getByText('10:30:45')).toBeInTheDocument();
  });

  it('should update time every second', () => {
    render(<TimeCapsule lang="zh" />);
    expect(screen.getByText('10:30:45')).toBeInTheDocument();

    jest.advanceTimersByTime(1000);
    expect(screen.getByText('10:30:46')).toBeInTheDocument();

    jest.advanceTimersByTime(1000);
    expect(screen.getByText('10:30:47')).toBeInTheDocument();
  });

  it('should render clock icon', () => {
    render(<TimeCapsule lang="zh" />);
    const clockIcon = screen.getByRole('generic').querySelector('svg');
    expect(clockIcon).toBeInTheDocument();
  });

  it('should have proper aria-label with full date', () => {
    render(<TimeCapsule lang="zh" />);
    const container = screen.getByLabelText(/2026/);
    expect(container).toBeInTheDocument();
  });

  it('should format time with leading zeros', () => {
    jest.setSystemTime(new Date('2026-05-09T09:05:03'));
    render(<TimeCapsule lang="zh" />);
    expect(screen.getByText('09:05:03')).toBeInTheDocument();
  });

  it('should support English locale', () => {
    render(<TimeCapsule lang="en" />);
    const container = screen.getByLabelText(/2026/);
    expect(container).toBeInTheDocument();
  });
});
