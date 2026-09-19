import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HGReveal, HGStaggerGroup, HGTextReveal } from '@/components/landing/motion';

describe('Home Guide landing motion primitives', () => {
  const originalObserver = window.IntersectionObserver;

  afterEach(() => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, writable: true, value: originalObserver });
    vi.restoreAllMocks();
  });

  it('shows content immediately when IntersectionObserver is unavailable', () => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, writable: true, value: undefined });
    const { container } = render(<HGReveal>Visible fallback</HGReveal>);
    expect(screen.getByText('Visible fallback')).toBeVisible();
    expect(container.firstChild).toHaveClass('is-visible');
  });

  it('uses the specified reveal defaults', () => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, writable: true, value: undefined });
    const { container } = render(<HGReveal>Default motion</HGReveal>);
    expect(container.firstChild).toHaveAttribute('data-direction', 'up');
    expect(container.firstChild).toHaveStyle({ '--hg-delay': '0ms', '--hg-duration': '720ms' });
  });

  it('applies the 90ms default stagger step', () => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, writable: true, value: undefined });
    const { container } = render(<HGStaggerGroup><span>One</span><span>Two</span><span>Three</span></HGStaggerGroup>);
    const children = Array.from(container.firstElementChild?.children ?? []);
    expect(children[0]).toHaveStyle({ '--hg-delay': '0ms' });
    expect(children[1]).toHaveStyle({ '--hg-delay': '90ms' });
    expect(children[2]).toHaveStyle({ '--hg-delay': '180ms' });
  });

  it('uses the specified text reveal duration', () => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, writable: true, value: undefined });
    const { container } = render(<HGTextReveal>Editorial heading</HGTextReveal>);
    expect(screen.getByRole('heading', { name: 'Editorial heading' })).toBeVisible();
    expect(container.firstChild).toHaveStyle({ '--hg-duration': '820ms' });
  });
});