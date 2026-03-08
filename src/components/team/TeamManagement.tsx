import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Users, Plus, Copy, Link2, Loader2, Phone, UserPlus, Trash2, CheckCircle2
} from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  status: string;
  user_id: string | null;
  created_at: string;
}

interface TeamInvite {
  id: string;
  code: string;
  role: string;
  max_uses: number;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function TeamManagement() {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const { currentEstate } = useEstate();
  const es = language === 'es';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add member form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('crew');

  // Invite form
  const [inviteRole, setInviteRole] = useState('crew');
  const [inviteMaxUses, setInviteMaxUses] = useState(10);

  useEffect(() => {
    if (profile?.org_id) fetchData();
  }, [profile?.org_id, currentEstate]);

  const fetchData = async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        supabase.from('team_members').select('*').eq('org_id', profile.org_id).order('full_name'),
        supabase.from('team_invites').select('*').eq('org_id', profile.org_id).eq('active', true).order('created_at', { ascending: false }),
      ]);
      setMembers((membersRes.data as TeamMember[]) || []);
      setInvites((invitesRes.data as TeamInvite[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    if (!profile?.org_id || !newName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('team_members').insert({
        org_id: profile.org_id,
        estate_id: currentEstate?.id || null,
        full_name: newName.trim(),
        phone: newPhone.trim() || null,
        role: newRole,
      });
      if (error) throw error;
      toast.success(es ? '✅ Miembro agregado' : '✅ Member added');
      setShowAddMember(false);
      setNewName('');
      setNewPhone('');
      setNewRole('crew');
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const createInvite = async () => {
    if (!profile?.org_id || !user) return;
    setSaving(true);
    try {
      const code = generateCode();
      const { error } = await supabase.from('team_invites').insert({
        org_id: profile.org_id,
        estate_id: currentEstate?.id || null,
        code,
        role: inviteRole,
        created_by: user.id,
        max_uses: inviteMaxUses,
      });
      if (error) throw error;
      toast.success(es ? `✅ Código creado: ${code}` : `✅ Code created: ${code}`);
      setShowCreateInvite(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(es ? 'Código copiado' : 'Code copied');
  };

  const deactivateInvite = async (id: string) => {
    await supabase.from('team_invites').update({ active: false }).eq('id', id);
    fetchData();
  };

  const removeMember = async (id: string) => {
    await supabase.from('team_members').update({ status: 'inactive' }).eq('id', id);
    fetchData();
    toast.success(es ? 'Miembro removido' : 'Member removed');
  };

  const roleLabel = (role: string) => {
    const map: Record<string, { en: string; es: string }> = {
      crew: { en: 'Crew', es: 'Equipo' },
      manager: { en: 'Manager', es: 'Gerente' },
      vendor: { en: 'Vendor', es: 'Proveedor' },
    };
    return es ? map[role]?.es || role : map[role]?.en || role;
  };

  const activeMembers = members.filter(m => m.status === 'active');

  return (
    <div className="space-y-6">
      {/* Team members */}
      <Card className="estate-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {es ? 'Equipo de Trabajo' : 'Work Team'}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {es ? 'Miembros del equipo y empleados registrados' : 'Team members and registered employees'}
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              {es ? 'Agregar' : 'Add'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : activeMembers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              {es ? 'Sin miembros del equipo. Agrega trabajadores o genera un código de invitación.' : 'No team members. Add workers or generate an invite code.'}
            </div>
          ) : (
            <div className="space-y-2">
              {activeMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {m.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{m.full_name}</span>
                      <Badge variant="secondary" className="text-[10px]">{roleLabel(m.role)}</Badge>
                      {m.user_id && (
                        <Badge variant="outline" className="text-[10px] text-success border-success/30">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{es ? 'Con cuenta' : 'Has account'}
                        </Badge>
                      )}
                    </div>
                    {m.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />{m.phone}
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeMember(m.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite codes */}
      <Card className="estate-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                {es ? 'Códigos de Invitación' : 'Invite Codes'}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {es ? 'Comparte un código para que trabajadores se unan a tu equipo' : 'Share a code so workers can join your team'}
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowCreateInvite(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {es ? 'Generar' : 'Generate'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              {es ? 'Sin códigos activos' : 'No active codes'}
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-lg font-bold tracking-wider text-primary">{inv.code}</code>
                      <Badge variant="secondary" className="text-[10px]">{roleLabel(inv.role)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.used_count}/{inv.max_uses} {es ? 'usos' : 'uses'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyCode(inv.code)}>
                    <Copy className="h-3.5 w-3.5 mr-1" />{es ? 'Copiar' : 'Copy'}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deactivateInvite(inv.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{es ? 'Agregar Miembro' : 'Add Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{es ? 'Nombre completo' : 'Full Name'}</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label>{es ? 'Teléfono (opcional)' : 'Phone (optional)'}</Label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+506 8888-8888" />
            </div>
            <div className="space-y-2">
              <Label>{es ? 'Rol' : 'Role'}</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="crew">{es ? 'Equipo (Crew)' : 'Crew'}</SelectItem>
                  <SelectItem value="manager">{es ? 'Gerente' : 'Manager'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addMember} disabled={!newName.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {es ? 'Agregar' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invite Dialog */}
      <Dialog open={showCreateInvite} onOpenChange={setShowCreateInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{es ? 'Generar Código de Invitación' : 'Generate Invite Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{es ? 'Rol para nuevos miembros' : 'Role for new members'}</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="crew">{es ? 'Equipo (Crew)' : 'Crew'}</SelectItem>
                  <SelectItem value="manager">{es ? 'Gerente' : 'Manager'}</SelectItem>
                  <SelectItem value="vendor">{es ? 'Proveedor' : 'Vendor'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{es ? 'Máximo de usos' : 'Max uses'}</Label>
              <Input type="number" value={inviteMaxUses} onChange={e => setInviteMaxUses(Number(e.target.value))} min={1} max={100} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createInvite} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
              {es ? 'Generar Código' : 'Generate Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
