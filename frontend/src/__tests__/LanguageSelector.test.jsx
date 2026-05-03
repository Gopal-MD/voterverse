import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSelector from '../components/LanguageSelector';

describe('LanguageSelector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the language select dropdown', () => {
    render(<LanguageSelector onLanguageChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: /change regional language/i });
    expect(select).toBeInTheDocument();
  });

  it('defaults to English when no persisted language is set', () => {
    render(<LanguageSelector onLanguageChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: /change regional language/i });
    expect(select.value).toBe('en');
  });

  it('restores persisted language from localStorage', () => {
    localStorage.setItem('vv-lang', 'hi');
    render(<LanguageSelector onLanguageChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: /change regional language/i });
    expect(select.value).toBe('hi');
  });

  it('persists selected language to localStorage', () => {
    render(<LanguageSelector onLanguageChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: /change regional language/i });
    fireEvent.change(select, { target: { value: 'ta' } });
    expect(localStorage.getItem('vv-lang')).toBe('ta');
  });

  it('calls onLanguageChange callback when language is changed', () => {
    const handleChange = vi.fn();
    render(<LanguageSelector onLanguageChange={handleChange} />);
    const select = screen.getByRole('combobox', { name: /change regional language/i });
    fireEvent.change(select, { target: { value: 'bn' } });
    expect(handleChange).toHaveBeenCalledWith('bn');
  });

  it('has a language selection region landmark', () => {
    render(<LanguageSelector onLanguageChange={() => {}} />);
    expect(screen.getByRole('region', { name: /language selection/i })).toBeInTheDocument();
  });
});
