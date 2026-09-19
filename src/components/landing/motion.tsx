import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type HGRevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';

export interface HGRevealProps {
  children: ReactNode;
  className?: string;
  direction?: HGRevealDirection;
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

export function HGReveal({ children, className, direction = 'up', delay = 0, duration = 720, threshold = 0.18, once = true }: HGRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window.IntersectionObserver !== 'function') {
      setVisible(true);
      return;
    }
    try {
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry) return;
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.unobserve(node);
      }, { threshold });
      observer.observe(node);
      return () => observer.disconnect();
    } catch {
      setVisible(true);
      return;
    }
  }, [once, threshold]);

  return (
    <div ref={ref} className={cn('hg-reveal', visible && 'is-visible', className)} data-direction={direction}
      style={{ '--hg-delay': `${delay}ms`, '--hg-duration': `${duration}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

interface HGStaggerGroupProps {
  children: ReactNode;
  className?: string;
  startDelay?: number;
  step?: number;
  direction?: HGRevealDirection;
}

export function HGStaggerGroup({ children, className, startDelay = 0, step = 90, direction = 'up' }: HGStaggerGroupProps) {
  return <div className={className}>{Children.map(children, (child, index) => (
    <HGReveal direction={direction} delay={startDelay + index * step}>{child}</HGReveal>
  ))}</div>;
}

interface HGTextRevealProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  delay?: number;
  duration?: number;
  threshold?: number;
}

export function HGTextReveal({ children, as: Tag = 'h2', className, delay = 0, duration = 820, threshold = 0.2 }: HGTextRevealProps) {
  return (
    <HGReveal direction="none" delay={delay} duration={duration} threshold={threshold} className="hg-text-mask">
      <Tag className={cn('hg-text-reveal', className)}>{children}</Tag>
    </HGReveal>
  );
}

interface LandingSectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  note?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function LandingSectionHeading({ eyebrow, title, subtitle, note, align = 'left', className }: LandingSectionHeadingProps) {
  return (
    <div className={cn('landing-heading', align === 'center' && 'text-center mx-auto', className)}>
      <HGReveal direction="none" duration={520}><p className="landing-eyebrow">{eyebrow}</p></HGReveal>
      <HGTextReveal delay={60} duration={880} className="landing-title">{title}</HGTextReveal>
      {subtitle && <HGReveal delay={150} duration={760}><p className="landing-subtitle">{subtitle}</p></HGReveal>}
      {note && <HGReveal direction="none" delay={230} duration={620}><p className="landing-note">{note}</p></HGReveal>}
    </div>
  );
}

export function MediaReveal({ children, className }: { children: ReactElement<{ className?: string }>; className?: string }) {
  const media = isValidElement(children) ? cloneElement(children, { className: cn(children.props.className, 'hg-media-inner') }) : children;
  return <HGReveal className={cn('hg-media-mask', className)}>{media}</HGReveal>;
}
