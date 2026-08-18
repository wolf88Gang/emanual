import React, { useEffect, useState } from 'react';
import { Loader2, Copy, RefreshCw, Ban, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  fetchClientPortalLink,
  createClientPortalLink,
  rotateClientPortalLink,
  updateClientPortalLink,
  revokeClientPortalLink,
  PORTAL_TOGGLES,
  PORTAL_TOGGLE_LABELS,
  type ClientPortalLink,
} from '@/lib/plantopsComms';

interface Props {
  clientId: string;
}

/**
 * Aggregated client portal: one login-free link covering every project of this
 * client. The clear token is shown only right after creation or rotation.
 */
export function ClientPortalPanel({ clientId }: Props) {
  const { toast } = useToast();
  const { tl } = useLanguage();
  const l = (en: string, es: string) => tl({ en, es, de: en });

  const [link, setLink] = useState<ClientPortalLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setLink(await fetchClientPortalLink(clientId));
    } catch (e: any) {
      toast({ title: l('Could not load portal', 'No se pudo cargar el portal'), description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setFreshToken(null);
  }, [clientId]);

  const portalUrl = (token: string) => `${window.location.origin}/cliente/${token}`;

  const create = async () => {
    setSaving(true);
    try {
      const token = await createClientPortalLink(clientId, {});
      setFreshToken(token);
      await load();
      toast({ title: l('Portal link created', 'Enlace de portal creado') });
    } catch (e: any) {
      toast({ title: l('Could not create link', 'No se pudo crear el enlace'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const rotate = async () => {
    if (!link) return;
    setSaving(true);
    try {
      const token = await rotateClientPortalLink(link.id);
      setFreshToken(token);
      await load();
      toast({ title: l('Link rotated — the previous one no longer works', 'Enlace rotado — el anterior ya no funciona') });
    } catch (e: any) {
      toast({ title: l('Could not rotate', 'No se pudo rotar'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    if (!link) return;
    setSaving(true);
    try {
      await revokeClientPortalLink(link.id);
      setFreshToken(null);
      await load();
      toast({ title: l('Portal revoked', 'Portal revocado') });
    } catch (e: any) {
      toast({ title: l('Could not revoke', 'No se pudo revocar'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (key: string, value: boolean) => {
    if (!link) return;
    const next = { ...link, [key]: value } as ClientPortalLink;
    setLink(next);
    try {
      await updateClientPortalLink(next);
    } catch (e: any) {
      await load();
      toast({ title: l('Could not save', 'No se pudo guardar'), description: e.message, variant: 'destructive' });
    }
  };

  const saveNote = async (note: string, expires: string) => {
    if (!link) return;
    const next = { ...link, contact_note: note || null, expires_at: expires ? new Date(expires).toISOString() : null };
    setSaving(true);
    try {
      await updateClientPortalLink(next);
      setLink(next);
      toast({ title: l('Portal updated', 'Portal actualizado') });
    } catch (e: any) {
      toast({ title: l('Could not save', 'No se pudo guardar'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  if (!link) {
    return (
      <Card><CardContent className="p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          {l(
            'No aggregated portal yet. One link shows this client every project they have with you.',
            'Aún no hay portal agregado. Un solo enlace muestra al cliente todos sus proyectos con usted.',
          )}
        </p>
        <Button onClick={create} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Create client portal', 'Crear portal del cliente')}
        </Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant="default">{l('Active', 'Activo')}</Badge>
          <span className="text-xs text-muted-foreground">
            {l('Created', 'Creado')}: {new Date(link.created_at).toLocaleDateString()}
          </span>
        </div>

        {freshToken ? (
          <div className="space-y-2">
            <Label>{l('Share this link now — it is shown only once', 'Comparta este enlace ahora — se muestra una sola vez')}</Label>
            <div className="flex gap-2">
              <Input readOnly value={portalUrl(freshToken)} onFocus={(e) => e.currentTarget.select()} />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(portalUrl(freshToken));
                  toast({ title: l('Link copied', 'Enlace copiado') });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => window.open(portalUrl(freshToken), '_blank')}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {l(
              'The link is stored hashed and cannot be shown again. Rotate it to get a new one.',
              'El enlace se guarda cifrado y no puede volver a mostrarse. Rótelo para obtener uno nuevo.',
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={rotate} disabled={saving}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />{l('Rotate link', 'Rotar enlace')}
          </Button>
          <Button size="sm" variant="ghost" onClick={revoke} disabled={saving}>
            <Ban className="h-3.5 w-3.5 mr-1" />{l('Revoke', 'Revocar')}
          </Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-3">
        <div className="text-sm font-medium">{l('What the client sees', 'Qué ve el cliente')}</div>
        {PORTAL_TOGGLES.map((k) => (
          <div key={k} className="flex items-center justify-between gap-2">
            <Label className="text-sm">{tl({ ...PORTAL_TOGGLE_LABELS[k], de: PORTAL_TOGGLE_LABELS[k].en })}</Label>
            <Switch checked={!!(link as any)[k]} onCheckedChange={(v) => toggle(k, v)} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          {l(
            'Per-project portal settings can only narrow this, never widen it. Manuals appear only when approved.',
            'La configuración por proyecto solo puede restringir esto, nunca ampliarlo. Los manuales aparecen solo si están aprobados.',
          )}
        </p>
      </CardContent></Card>

      <PortalNoteEditor link={link} saving={saving} onSave={saveNote} />
    </div>
  );
}

function PortalNoteEditor({
  link,
  saving,
  onSave,
}: {
  link: ClientPortalLink;
  saving: boolean;
  onSave: (note: string, expires: string) => void;
}) {
  const { tl } = useLanguage();
  const l = (en: string, es: string) => tl({ en, es, de: en });
  const [note, setNote] = useState(link.contact_note ?? '');
  const [expires, setExpires] = useState(link.expires_at ? link.expires_at.slice(0, 10) : '');

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="space-y-1">
        <Label>{l('Contact note shown in the portal', 'Nota de contacto visible en el portal')}</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>{l('Expiry date (optional)', 'Fecha de expiración (opcional)')}</Label>
        <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </div>
      <Button size="sm" onClick={() => onSave(note, expires)} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Save', 'Guardar')}
      </Button>
    </CardContent></Card>
  );
}
