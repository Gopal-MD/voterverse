import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FraudReportCenter from '../pages/FraudReportCenter';

describe('FraudReportCenter', () => {
  it('disables submit on empty description', () => {
    render(<BrowserRouter><FraudReportCenter /></BrowserRouter>);
    const submitBtn = screen.getByRole('button', { name: /submit report/i });
    expect(submitBtn).toBeDisabled();
  });

  it('shows privacy notice', () => {
    render(<BrowserRouter><FraudReportCenter /></BrowserRouter>);
    expect(screen.getByText(/anonymized/i)).toBeInTheDocument();
  });

  it('has description textarea', () => {
    render(<BrowserRouter><FraudReportCenter /></BrowserRouter>);
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });
});
