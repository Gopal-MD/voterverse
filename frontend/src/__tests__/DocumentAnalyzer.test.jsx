import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DocumentAnalyzer from '../pages/DocumentAnalyzer';

describe('DocumentAnalyzer', () => {
  it('shows privacy notice before upload', () => {
    render(
      <BrowserRouter>
        <DocumentAnalyzer />
      </BrowserRouter>
    );
    expect(screen.getByText(/never stored/i)).toBeInTheDocument();
    expect(screen.getByText(/in-memory only/i)).toBeInTheDocument();
  });

  it('has upload zone', () => {
    render(
      <BrowserRouter>
        <DocumentAnalyzer />
      </BrowserRouter>
    );
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
  });

  it('has analyze button', () => {
    render(
      <BrowserRouter>
        <DocumentAnalyzer />
      </BrowserRouter>
    );
    const btn = screen.getByRole('button', { name: /analyze document/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled(); // disabled when no file
  });
});
