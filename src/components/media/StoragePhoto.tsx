import React, { useEffect, useState } from 'react';
import { resolvePhotoUrl } from '@/lib/photoUrls';

interface StoragePhotoProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Stored photo reference (legacy public URL, signed URL or external URL). */
  src: string | null | undefined;
  fallback?: React.ReactNode;
}

/** Renders a private-bucket photo through a short-lived signed link. */
export function StoragePhoto({ src, fallback = null, ...imgProps }: StoragePhotoProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setUrl(null);
    resolvePhotoUrl(src)
      .then((resolved) => {
        if (cancelled) return;
        if (resolved) setUrl(resolved);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || failed) return <>{fallback}</>;
  if (!url) return <div className={imgProps.className} aria-hidden />;
  return <img {...imgProps} src={url} />;
}
