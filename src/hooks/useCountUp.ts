import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from 0 to `target` with an ease-out curve.
 * Respects `prefers-reduced-motion` by jumping straight to the value.
 */
export function useCountUp(target: number | null | undefined, duration = 900) {
  const safeTarget = typeof target === 'number' && Number.isFinite(target) ? target : 0;
  const [value, setValue] = useState(safeTarget === 0 ? 0 : 0);
  const frame = useRef<number>();

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced || duration <= 0) {
      setValue(safeTarget);
      return;
    }

    const start = performance.now();
    const from = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (safeTarget - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [safeTarget, duration]);

  return value;
}
