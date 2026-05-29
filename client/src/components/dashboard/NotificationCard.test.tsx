import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationCard } from './NotificationCard';

const BASE_NOTIF = {
  id: 'n1',
  type: 'mention',
  title: 'Maurice mentioned you',
  message: 'in "Pileo Rewrite"',
  isRead: false,
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
};

describe('NotificationCard', () => {
  it('renders title and message', () => {
    render(<NotificationCard notification={BASE_NOTIF} onClick={vi.fn()} />);
    expect(screen.getByText(/Maurice mentioned you/)).toBeInTheDocument();
    expect(screen.getByText(/Pileo Rewrite/)).toBeInTheDocument();
  });

  it('calls onClick with the notification when the card is clicked', async () => {
    const onClick = vi.fn();
    render(<NotificationCard notification={BASE_NOTIF} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(BASE_NOTIF);
  });

  it('skips the message section when not provided', () => {
    render(<NotificationCard notification={{ ...BASE_NOTIF, message: null }} onClick={vi.fn()} />);
    expect(screen.queryByText(/Pileo Rewrite/)).not.toBeInTheDocument();
  });
});
