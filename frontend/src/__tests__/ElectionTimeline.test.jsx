import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ElectionTimeline from '../pages/ElectionTimeline';

// Mock fetch
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          timeline: [
            {
              step: 1,
              title: 'Election Announcement',
              description: 'ECI announces schedule',
              icon: '📢',
              date: 'T-45',
              details: '',
            },
            {
              step: 2,
              title: 'Voter Roll Revision',
              description: 'Rolls updated',
              icon: '📋',
              date: 'T-40',
              details: '',
            },
            {
              step: 3,
              title: 'Nomination Filing',
              description: 'Candidates file',
              icon: '📝',
              date: 'T-30',
              details: '',
            },
            {
              step: 4,
              title: 'Scrutiny & Withdrawal',
              description: 'Scrutiny process',
              icon: '🔍',
              date: 'T-25',
              details: '',
            },
            {
              step: 5,
              title: 'Campaign Period',
              description: 'Campaigning',
              icon: '📣',
              date: 'T-20',
              details: '',
            },
            {
              step: 6,
              title: 'Polling Day',
              description: 'Voters cast ballots',
              icon: '🗳️',
              date: 'Day',
              details: '',
            },
            {
              step: 7,
              title: 'Counting & Results',
              description: 'Votes counted',
              icon: '📊',
              date: 'T+3',
              details: '',
            },
          ],
        }),
    })
  );
});

describe('ElectionTimeline', () => {
  it('renders all 7 steps', async () => {
    render(
      <BrowserRouter>
        <ElectionTimeline />
      </BrowserRouter>
    );
    // Wait for async data
    const step1 = await screen.findByText(/Election Announcement/);
    expect(step1).toBeInTheDocument();
    expect(screen.getByText(/Voter Roll Revision/)).toBeInTheDocument();
    expect(screen.getByText(/Nomination Filing/)).toBeInTheDocument();
    expect(screen.getByText(/Scrutiny & Withdrawal/)).toBeInTheDocument();
    expect(screen.getByText(/Campaign Period/)).toBeInTheDocument();
    expect(screen.getByText(/Polling Day/)).toBeInTheDocument();
    expect(screen.getByText(/Counting & Results/)).toBeInTheDocument();
  });

  it('has correct ARIA list role', async () => {
    render(
      <BrowserRouter>
        <ElectionTimeline />
      </BrowserRouter>
    );
    await screen.findByText(/Election Announcement/);
    const list = screen.getByRole('list', { name: /election process/i });
    expect(list).toBeInTheDocument();
  });
});
