import React, { useEffect, useState } from 'react';
import { CheckCircle2, Database, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

type Check = { name: string; ok: boolean; detail: string };
export default function PlatformSystem() {
  const { language } = useLanguage(); const l = (en: string, es: string, de: string) => language === 'es' ? es : language === 'de' ? de : en;
  const [checks, setChecks] = useState<Check[]>([]); const [loading, setLoading] = useState(true);
  async function run() {
    setLoading(true);
    const [database, auth, storage] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.auth.getSession(),
      supabase.storage.listBuckets(),
    ]);
    setChecks([
      { name: l('Database access', 'Acceso a datos', 'Datenbankzugriff'), ok: !database.error, detail: database.error?.message ?? l('Query succeeded', 'Consulta exitosa', 'Abfrage erfolgreich') },
      { name: l('Administrator session', 'Sesión administrativa', 'Administratorsitzung'), ok: Boolean(auth.data.session) && !auth.error, detail: auth.error?.message ?? (auth.data.session ? l('Signed in', 'Sesión activa', 'Angemeldet') : l('No active session', 'Sin sesión activa', 'Keine aktive Sitzung')) },
      { name: l('File storage access', 'Acceso a archivos', 'Dateispeicherzugriff'), ok: !storage.error, detail: storage.error?.message ?? l('Storage responded', 'El almacenamiento respondió', 'Speicher hat geantwortet') },
    ]);
    setLoading(false);
  }
  useEffect(() => { void run(); }, []);
  return <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6"><header className="flex items-start justify-between gap-4"><div><h1 className="font-display text-2xl font-bold">{l('System checks', 'Verificación del sistema', 'Systemprüfungen')}</h1><p className="mt-1 text-sm text-muted-foreground">{l('Live connectivity checks, not simulated status labels.', 'Comprobaciones reales de conectividad, no estados simulados.', 'Live-Verbindungsprüfungen statt simulierter Statusanzeigen.')}</p></div><Button variant="outline" onClick={() => void run()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{l('Run checks', 'Comprobar', 'Prüfen')}</Button></header><div className="space-y-3">{(loading && checks.length === 0 ? [0,1,2] : checks).map((check, index) => typeof check === 'number' ? <div key={check} className="h-20 animate-pulse rounded-md bg-muted" /> : <div key={check.name} className="flex items-start gap-3 rounded-md border bg-card p-4">{check.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" /> : <XCircle className="mt-0.5 h-5 w-5 text-destructive" />}<div><p className="font-medium">{check.name}</p><p className="text-sm text-muted-foreground">{check.detail}</p></div></div>)}</div><div className="grid gap-3 sm:grid-cols-2"><div className="flex gap-3 rounded-md border p-4"><Database className="h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">{l('Checks use read-only requests.', 'Las comprobaciones son de solo lectura.', 'Prüfungen verwenden schreibgeschützte Anfragen.')}</p></div><div className="flex gap-3 rounded-md border p-4"><ShieldCheck className="h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">{l('Platform administrator access remains enforced.', 'Se mantiene el acceso exclusivo de administrador.', 'Plattform-Adminzugriff bleibt erzwungen.')}</p></div></div></div>;
}