import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import {
  Star, MapPin, Briefcase, Save, Loader2, Plus, X, User, Award, Calendar
} from 'lucide-react';

const SKILL_OPTIONS = [
  'Lawn Care', 'Tree Trimming', 'Irrigation', 'Landscaping', 'Pest Control',
  'Planting', 'Hardscaping', 'Fertilization', 'Pool Maintenance', 'Fencing',
  'General Maintenance', 'Pressure Washing', 'Garden Design',
];

export default function MyWorkerProfile() {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const es = language === 'es';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  // Form state
  const [bio, setBio] = useState('');
  const [bioEs, setBioEs] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [serviceZoneText, setServiceZoneText] = useState('');
  const [available, setAvailable] = useState(true);

  // Read-only stats
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [ratings, setRatings] = useState<any[]>([]);
  const [jobCount, setJobCount] = useState(0);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: wp } = await supabase
        .from('worker_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (wp) {
        setExists(true);
        setBio((wp as any).bio || '');
        setBioEs((wp as any).bio_es || '');
        setSkills((wp as any).skills || []);
        setHourlyRate((wp as any).hourly_rate);
        setCurrency((wp as any).currency || 'USD');
        setServiceZoneText((wp as any).service_zone_text || '');
        setAvailable((wp as any).available ?? true);
        setRatingAvg(Number((wp as any).rating_avg) || 0);
        setRatingCount((wp as any).rating_count || 0);
      }

      // Fetch ratings
      const { data: r } = await supabase
        .from('job_ratings')
        .select('*, job_postings:job_id(title)')
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });
      setRatings(r || []);

      // Fetch completed jobs count
      const { count } = await supabase
        .from('job_applications')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', user.id)
        .eq('status', 'accepted');
      setJobCount(count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        bio: bio.trim() || null,
        bio_es: bioEs.trim() || null,
        skills,
        hourly_rate: hourlyRate,
        currency,
        service_zone_text: serviceZoneText.trim() || null,
        available,
      };

      if (exists) {
        const { error } = await supabase
          .from('worker_profiles')
          .update(payload)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('worker_profiles')
          .insert(payload);
        if (error) throw error;
        setExists(true);
      }

      toast.success(es ? '✅ Perfil guardado' : '✅ Profile saved');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || (es ? 'Error al guardar' : 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6 max-w-3xl">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold">
            {es ? 'Mi Perfil' : 'My Profile'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {es ? 'Gestiona tu perfil público de trabajador' : 'Manage your public worker profile'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {es ? 'Guardar' : 'Save'}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="estate-card">
          <CardContent className="p-4 text-center">
            <Star className="h-5 w-5 mx-auto text-accent mb-1" />
            <div className="text-2xl font-bold">{ratingAvg.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">{ratingCount} {es ? 'reseñas' : 'reviews'}</div>
          </CardContent>
        </Card>
        <Card className="estate-card">
          <CardContent className="p-4 text-center">
            <Briefcase className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{jobCount}</div>
            <div className="text-xs text-muted-foreground">{es ? 'Trabajos' : 'Jobs'}</div>
          </CardContent>
        </Card>
        <Card className="estate-card">
          <CardContent className="p-4 text-center">
            <Award className="h-5 w-5 mx-auto text-success mb-1" />
            <div className="text-2xl font-bold">{available ? '✓' : '—'}</div>
            <div className="text-xs text-muted-foreground">{es ? 'Disponible' : 'Available'}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="edit">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit" className="gap-2">
            <User className="h-3.5 w-3.5" />
            {es ? 'Editar Perfil' : 'Edit Profile'}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="h-3.5 w-3.5" />
            {es ? 'Reseñas' : 'Reviews'} ({ratings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4 space-y-5">
          {/* Availability */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-success/5 border-success/20">
            <div>
              <p className="font-medium text-sm">{es ? 'Disponible para trabajo' : 'Available for work'}</p>
              <p className="text-xs text-muted-foreground">
                {es ? 'Los empleadores te verán como disponible' : 'Employers will see you as available'}
              </p>
            </div>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label>{es ? 'Biografía (Inglés)' : 'Bio (English)'}</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              placeholder={es ? 'Describe tu experiencia...' : 'Describe your experience...'} />
          </div>
          <div className="space-y-2">
            <Label>{es ? 'Biografía (Español)' : 'Bio (Spanish)'}</Label>
            <Textarea value={bioEs} onChange={e => setBioEs(e.target.value)} rows={3}
              placeholder={es ? 'Describe tu experiencia en español...' : 'Bio in Spanish...'} />
          </div>

          {/* Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{es ? 'Tarifa por hora' : 'Hourly Rate'}</Label>
              <Input type="number" value={hourlyRate ?? ''} onChange={e => setHourlyRate(e.target.value ? Number(e.target.value) : null)}
                placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>{es ? 'Moneda' : 'Currency'}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="CRC">CRC (₡)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Service Zone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {es ? 'Zona de servicio' : 'Service Zone'}
            </Label>
            <Input value={serviceZoneText} onChange={e => setServiceZoneText(e.target.value)}
              placeholder={es ? 'Ej: San José, Escazú, Santa Ana' : 'e.g. San José, Escazú, Santa Ana'} />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label>{es ? 'Habilidades' : 'Skills'}</Label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(skill => (
                <Badge key={skill} variant={skills.includes(skill) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleSkill(skill)}>
                  {skills.includes(skill) && <span className="mr-1">✓</span>}
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-3">
          {ratings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Star className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium">{es ? 'Sin reseñas aún' : 'No reviews yet'}</p>
                <p className="text-xs mt-1">{es ? 'Completa trabajos para recibir evaluaciones' : 'Complete jobs to receive ratings'}</p>
              </CardContent>
            </Card>
          ) : ratings.map((r: any) => (
            <Card key={r.id} className="estate-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.score ? 'text-accent fill-accent' : 'text-muted'}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                {r.job_postings?.title && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {es ? 'Trabajo:' : 'Job:'} {r.job_postings.title}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
