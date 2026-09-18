import { supabase } from '@/integrations/supabase/client';

/**
 * Evidence photos live in private buckets. Historic records store the old
 * public URL, so we parse the bucket + path back out and mint a short-lived
 * signed link on read.
 */
const PUBLIC_MARKER = '/storage/v1/object/public/';
const SIGNED_MARKER = '/storage/v1/object/sign/';

export interface StorageRef {
  bucket: string;
  path: string;
}

export function parseStorageRef(value: string | null | undefined): StorageRef | null {
  if (!value) return null;
  const marker = value.includes(PUBLIC_MARKER)
    ? PUBLIC_MARKER
    : value.includes(SIGNED_MARKER)
      ? SIGNED_MARKER
      : null;
  if (!marker) return null;
  const tail = value.split(marker)[1]?.split('?')[0];
  if (!tail) return null;
  const [bucket, ...rest] = tail.split('/');
  if (!bucket || rest.length === 0) return null;
  return { bucket, path: decodeURIComponent(rest.join('/')) };
}

const cache = new Map<string, { url: string; expires: number }>();

/** Returns a viewable URL for a stored photo reference, or null when it cannot be resolved. */
export async function resolvePhotoUrl(
  value: string | null | undefined,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!value) return null;
  const ref = parseStorageRef(value);
  if (!ref) return value; // external URL or already usable

  const key = `${ref.bucket}/${ref.path}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;

  const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  cache.set(key, { url: data.signedUrl, expires: Date.now() + (expiresInSeconds - 60) * 1000 });
  return data.signedUrl;
}
