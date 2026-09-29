import React, { useRef, useState } from 'react';
import { Camera, History, Loader2, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageDecodeError, processImage, type AssetKind, type PendingPhoto, type Pin } from '@/lib/visualBriefs';
import { useVbCopy } from './copy';

export interface HistoryPhoto { id: string; url: string; label: string }

interface Props {
  kind: AssetKind;
  label: string;
  hint?: string;
  photos: PendingPhoto[];
  onChange: (next: PendingPhoto[]) => void;
  multiple?: boolean;
  history?: HistoryPhoto[];
}

/** Captures canonical photos (processed before annotation) and optional pins. */
export function VisualPhotoPicker({ kind, label, hint, photos, onChange, multiple = false, history = [] }: Props) {
  const { t } = useVbCopy();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const p = await processImage(file);
      const item: PendingPhoto = { key: crypto.randomUUID(), kind, blob: p.blob, width: p.width, height: p.height, previewUrl: p.previewUrl, pins: [] };
      onChange(multiple ? [...photos, item] : [item]);
    } catch (err) {
      const m = err instanceof ImageDecodeError ? (err.message === 'heic' ? t.heic : t.decode)
        : (err as Error).message === 'too_large' ? t.tooLarge : (err as Error).message === 'not_image' ? t.notImage : t.decode;
      setError(m);
    } finally { setBusy(false); }
  }

  function pickHistory(h: HistoryPhoto) {
    const item: PendingPhoto = { key: crypto.randomUUID(), kind, previewUrl: h.url, pins: [], sourceAssetId: h.id };
    onChange(multiple ? [...photos, item] : [item]);
    setShowHistory(false);
  }

  function addPin(photo: PendingPhoto, e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const pin: Pin = { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), note: '' };
    onChange(photos.map(p => (p.key === photo.key ? { ...p, pins: [...p.pins, pin] } : p)));
  }
  const setPinNote = (key: string, i: number, note: string) =>
    onChange(photos.map(p => (p.key === key ? { ...p, pins: p.pins.map((q, j) => (j === i ? { ...q, note } : q)) } : p)));
  const removePin = (key: string, i: number) =>
    onChange(photos.map(p => (p.key === key ? { ...p, pins: p.pins.filter((_, j) => j !== i) } : p)));

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {photos.map(photo => (
        <div key={photo.key} className="space-y-2 rounded-lg border border-border p-2">
          <div className="relative cursor-crosshair select-none" onClick={e => addPin(photo, e)}>
            <img src={photo.previewUrl} alt={label} className="w-full rounded-md object-contain max-h-72 bg-muted" draggable={false} />
            {photo.pins.map((p, i) => (
              <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold ring-2 ring-background"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>{i + 1}</span>
            ))}
            <button type="button" aria-label="Remove" onClick={e => { e.stopPropagation(); onChange(photos.filter(p => p.key !== photo.key)); }}
              className="absolute top-2 right-2 rounded-full bg-background/90 p-1.5 text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{t.addPin}</p>
          {photo.pins.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-semibold w-5 text-center">{i + 1}</span>
              <Input value={p.note} maxLength={500} placeholder={t.pinNote} onChange={e => setPinNote(photo.key, i, e.target.value)} className="h-9" />
              <Button type="button" variant="ghost" size="icon" onClick={() => removePin(photo.key, i)}><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      ))}
      {(multiple || photos.length === 0) && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}{busy ? t.processing : t.takePhoto}
          </Button>
          {history.length > 0 && (
            <Button type="button" variant="ghost" className="h-11" onClick={() => setShowHistory(s => !s)}><History className="h-4 w-4 mr-2" />{t.fromHistory}</Button>
          )}
        </div>
      )}
      {showHistory && (
        <div className="grid grid-cols-3 gap-2">
          {history.map(h => (
            <button key={h.id} type="button" onClick={() => pickHistory(h)} className="text-left">
              <img src={h.url} alt={h.label} className="h-20 w-full rounded-md object-cover" />
              <span className="text-[11px] text-muted-foreground line-clamp-1">{h.label}</span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
    </div>
  );
}
