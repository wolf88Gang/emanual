import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, CreditCard, MapPin, Package, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { PlatformError, PlatformLoading } from '@/components/platform/PlatformPageState';

type Counts = { organizations: number; users: number; sites: number; assets: number; tasks: number; completed: number; subscriptions: number };
export default function PlatformMetrics() {
  const { language } = useLanguage(); const navigate = useNavigate();
  const l = (en: string, es: string, de: string) => language === 'es' ? es : language === 'de' ? de : en;
  const [counts, setCounts] = useState<Counts | null>(null); const [error, setError] = useState('');
  async function load() {
    setError('');
    const requests = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('estates').select('id', { count: 'exact', head: true }),
      supabase.from('assets').select('id', { count: 'exact', head: true }),
      supabase.from('tasks').select('id', { count: 'exact', head: true }),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    const failed = requests.find((request) => request.error);
    if (failed?.error) { setError(failed.error.message); return; }
    setCounts({ organizations: requests[0].count ?? 0, users: requests[1].count ?? 0, sites: requests[2].count ?? 0, assets: requests[3].count ?? 0, tasks: requests[4].count ?? 0, completed: requests[5].count ?? 0, subscriptions: requests[6].count ?? 0 });
  }
  useEffect(() => { void load(); }, []);
  const cards = counts ? [
    [l('Organizations', 'Organizaciones', 'Organisationen'), counts.organizations, Building2, '/platform/clients'],
    [l('Users', 'Usuarios', 'Benutzer'), counts.users, Users, '/platform/clients'],
    [l('Sites', 'Sitios', 'Standorte'), counts.sites, MapPin, '/platform/clients'],
    [l('Assets', 'Activos', 'Anlagen'), counts.assets, Package, null],
    [l('Tasks completed', 'Tareas completadas', 'Erledigte Aufgaben'), `${counts.completed}/${counts.tasks}`, CheckCircle2, null],
    [l('Active subscriptions', 'Suscripciones activas', 'Aktive Abonnements'), counts.subscriptions, CreditCard, '/platform/subscriptions'],
  ] as const : [];
  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6"><header><h1 className="font-display text-2xl font-bold">{l('Platform metrics', 'Métricas de plataforma', 'Plattformmetriken')}</h1><p className="mt-1 text-sm text-muted-foreground">{l('Current operational totals across client organizations.', 'Totales operativos actuales de las organizaciones cliente.', 'Aktuelle Betriebszahlen aller Kundenorganisationen.')}</p></header>{error ? <PlatformError message={error} retry={() => void load()} /> : !counts ? <PlatformLoading /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value, Icon, route]) => <div key={label} className="rounded-md border bg-card p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div><Icon className="h-6 w-6 text-primary" /></div>{route && <Button variant="link" className="mt-2 h-auto p-0" onClick={() => navigate(route)}>{l('View details', 'Ver detalles', 'Details ansehen')}</Button>}</div>)}</div>}</div>;
}