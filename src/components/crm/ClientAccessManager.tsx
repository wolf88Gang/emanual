import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserPlus, Copy, Eye, Settings2, Trash2, Mail, Link2 } from 'lucide-react';

interface ClientAccess {
  id: string;
  client_user_id: string;
  estate_id: string;
  can_view_map: boolean;
  can_view_assets: boolean;
  can_view_tasks: boolean;
  can_view_reports: boolean;
  can_view_photos: boolean;
  can_view_documents: boolean;
  can_view_work_hours: boolean;
  can_view_statistics: boolean;
  profile?: { full_name: string | null; email: string };
}

interface ClientInvite {
  id: string;
  code: string;
  email: string | null;
  estate_id: string;
  active: boolean;
  used_count: number;
  max_uses: number | null;
  can_view_map: boolean;
  can_view_assets: boolean;
  can_view_tasks: boolean;
  can_view_reports: boolean;
  can_view_photos: boolean;
  can_view_documents: boolean;
  can_view_work_hours: boolean;
  can_view_statistics: boolean;
}

const PERMISSION_LABELS = {
  can_view_map: { en: 'Map & Location', es: 'Mapa y Ubicación', de: 'Karte & Standort' },
  can_view_assets: { en: 'Assets', es: 'Activos', de: 'Anlagen' },
  can_view_tasks: { en: 'Tasks', es: 'Tareas', de: 'Aufgaben' },
  can_view_reports: { en: 'Reports & Manual', es: 'Reportes y Manual', de: 'Berichte & Handbuch' },
  can_view_photos: { en: 'Photos', es: 'Fotos', de: 'Fotos' },
  can_view_documents: { en: 'Documents', es: 'Documentos', de: 'Dokumente' },
  can_view_work_hours: { en: 'Work Hours (no pay)', es: 'Horas Trabajadas (sin monto)', de: 'Arbeitsstunden (ohne Betrag)' },
  can_view_statistics: { en: 'Statistics', es: 'Estadísticas', de: 'Statistiken' },
};

const PERM_KEYS = Object.keys(PERMISSION_LABELS) as (keyof typeof PERMISSION_LABELS)[];

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export function ClientAccessManager() {
  const { profile } = useAuth();
  const { currentEstate } = useEstate();
  const { tl, language } = useLanguage();
  const l = (en: string, es: string, de: string) => tl({ en, es, de });
  const getLang = (labels: { en: string; es: string; de: string }) => labels[language as keyof typeof labels] || labels.en;

  const [clients, setClients] = useState<ClientAccess[]>([]);
  const [invites, setInvites] = useState<ClientInvite[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientAccess | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePerms, setInvitePerms] = useState<Record<string, boolean>>({
    can_view_map: true,
    can_view_assets: true,
    can_view_tasks: true,
    can_view_reports: false,
    can_view_photos: true,
    can_view_documents: false,
    can_view_work_hours: false,
    can_view_statistics: false,
  });

  const estateId = currentEstate?.id;
  const orgId = profile?.org_id;

  useEffect(() => {
    if (!estateId || !orgId) return;
    fetchData();
  }, [estateId, orgId]);

  async function fetchData() {
    // Fetch client access records
    const { data: accessData } = await supabase
      .from('client_access')
      .select('*')
      .eq('estate_id', estateId!);

    if (accessData) {
      // Fetch profile info for each client
      const userIds = accessData.map((a: any) => a.client_user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
        : { data: [] };

      const enriched = accessData.map((a: any) => ({
        ...a,
        profile: (profiles || []).find((p: any) => p.id === a.client_user_id),
      }));
      setClients(enriched);
    }

    // Fetch invites
    const { data: inviteData } = await supabase
      .from('client_invites')
      .select('*')
      .eq('estate_id', estateId!)
      .eq('active', true);

    if (inviteData) setInvites(inviteData as any);
  }

  async function createInvite() {
    if (!estateId || !orgId || !profile) return;
    const code = generateCode();

    const { error } = await supabase.from('client_invites').insert({
      org_id: orgId,
      estate_id: estateId,
      invited_by: profile.id,
      code,
      email: inviteEmail || null,
      ...invitePerms,
    } as any);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(l('Invite created!', '¡Invitación creada!', 'Einladung erstellt!'));
    setShowInviteDialog(false);
    setInviteEmail('');
    fetchData();
  }

  async function updateClientPerms(client: ClientAccess) {
    const { error } = await supabase
      .from('client_access')
      .update({
        can_view_map: client.can_view_map,
        can_view_assets: client.can_view_assets,
        can_view_tasks: client.can_view_tasks,
        can_view_reports: client.can_view_reports,
        can_view_photos: client.can_view_photos,
        can_view_documents: client.can_view_documents,
        can_view_work_hours: client.can_view_work_hours,
        can_view_statistics: client.can_view_statistics,
      } as any)
      .eq('id', client.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(l('Permissions updated', 'Permisos actualizados', 'Berechtigungen aktualisiert'));
    setEditingClient(null);
    fetchData();
  }

  async function revokeAccess(clientId: string) {
    const { error } = await supabase.from('client_access').delete().eq('id', clientId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(l('Access revoked', 'Acceso revocado', 'Zugang widerrufen'));
    fetchData();
  }

  async function deactivateInvite(inviteId: string) {
    await supabase.from('client_invites').update({ active: false } as any).eq('id', inviteId);
    fetchData();
  }

  function copyInviteLink(code: string) {
    const url = `${window.location.origin}/join-client?code=${code}`;
    navigator.clipboard.writeText(url);
    toast.success(l('Link copied!', '¡Enlace copiado!', 'Link kopiert!'));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {l('Client Portal Access', 'Acceso Portal de Clientes', 'Kundenportal-Zugang')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {l(
              'Manage what your clients can see for this property',
              'Gestiona lo que tus clientes pueden ver de esta propiedad',
              'Verwalten Sie, was Ihre Kunden für diese Immobilie sehen können'
            )}
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {l('Invite Client', 'Invitar Cliente', 'Kunden einladen')}
        </Button>
      </div>

      {/* Active Clients */}
      {clients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {l('Active Clients', 'Clientes Activos', 'Aktive Kunden')} ({clients.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clients.map(client => (
              <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <p className="font-medium">{client.profile?.full_name || client.profile?.email || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{client.profile?.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PERM_KEYS.filter(k => (client as any)[k]).map(k => (
                      <Badge key={k} variant="secondary" className="text-[10px]">
                        {PERMISSION_LABELS[k].en}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditingClient({ ...client })}>
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => revokeAccess(client.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {l('Pending Invites', 'Invitaciones Pendientes', 'Ausstehende Einladungen')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold tracking-wider">{invite.code}</code>
                    {invite.email && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Mail className="h-3 w-3" />{invite.email}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {l('Used', 'Usado', 'Benutzt')}: {invite.used_count}/{invite.max_uses || '∞'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => copyInviteLink(invite.code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deactivateInvite(invite.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {clients.length === 0 && invites.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {l(
                'No clients have access yet. Invite a client to get started.',
                'Ningún cliente tiene acceso aún. Invita a un cliente para comenzar.',
                'Noch keine Kunden. Laden Sie einen Kunden ein.'
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{l('Invite Client', 'Invitar Cliente', 'Kunden einladen')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{l('Client Email (optional)', 'Email del Cliente (opcional)', 'Kunden-E-Mail (optional)')}</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="client@email.com"
              />
              <p className="text-xs text-muted-foreground">
                {l(
                  'Leave empty to create a shareable code',
                  'Deja vacío para crear un código compartible',
                  'Leer lassen für einen teilbaren Code'
                )}
              </p>
            </div>

            <div className="space-y-3">
              <Label>{l('Permissions', 'Permisos', 'Berechtigungen')}</Label>
              {PERM_KEYS.map(key => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{getLang(PERMISSION_LABELS[key])}</span>
                  <Switch
                    checked={invitePerms[key] || false}
                    onCheckedChange={v => setInvitePerms(prev => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              {l('Cancel', 'Cancelar', 'Abbrechen')}
            </Button>
            <Button onClick={createInvite} className="gap-2">
              <Link2 className="h-4 w-4" />
              {l('Create Invite', 'Crear Invitación', 'Einladung erstellen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {l('Edit Permissions', 'Editar Permisos', 'Berechtigungen bearbeiten')}
              {editingClient?.profile && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {editingClient.profile.full_name || editingClient.profile.email}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-3">
              {PERM_KEYS.map(key => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{PERMISSION_LABELS[key].en}</span>
                  <Switch
                    checked={(editingClient as any)[key] || false}
                    onCheckedChange={v => setEditingClient(prev => prev ? { ...prev, [key]: v } : null)}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)}>
              {l('Cancel', 'Cancelar', 'Abbrechen')}
            </Button>
            <Button onClick={() => editingClient && updateClientPerms(editingClient)}>
              {l('Save', 'Guardar', 'Speichern')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
