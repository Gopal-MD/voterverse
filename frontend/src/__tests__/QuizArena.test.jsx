import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuizArena from '../pages/QuizArena';

describe('QuizArena', () => {
  it('shows topic selection initially', () => {
    render(<BrowserRouter><QuizArena /></BrowserRouter>);
    expect(screen.getByText(/choose a topic/i)).toBeInTheDocument();
    expect(screen.getByText(/Voter Registration/)).toBeInTheDocument();
    expect(screen.getByText(/Election Commission/)).toBeInTheDocument();
  });

  it('starts quiz on topic click', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          question: {
            question: 'What is the minimum voting age?',
            options: ['16', '18', '21', '25'],
            correct_index: 1,
            explanation: 'The minimum age is 18.',
          },
        }),
      })
    );

    render(<BrowserRouter><QuizArena /></BrowserRouter>);
    const topicBtn = screen.getByText('Voter Registration');
    fireEvent.click(topicBtn);

    const q = await screen.findByText(/minimum voting age/i);
    expect(q).toBeInTheDocument();
  });
});
