import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, MapPin, DollarSign, Clock, Briefcase, Send, Plus, ArrowLeft, Star, User, Calendar, TrendingUp, CheckCircle2 } from 'lucide-react';

interface JobPosting {
  id: string;
  title: string;
  title_es: string | null;
  description: string;
  description_es: string | null;
  job_type: string;
  pay_amount: number | null;
  pay_type: string | null;
  currency: string;
  schedule_text: string | null;
  location_text: string | null;
  required_skills: string[];
  status: string;
  starts_at: string | null;
  created_at: string;
  org_id: string;
}

// Bilingual skill labels for display
const SKILL_LABELS: Record<string, string> = {
  'Lawn Care': 'Cuidado de Césped',
  'Tree Trimming': 'Poda de Árboles',
  'Irrigation': 'Riego',
  'Landscaping': 'Paisajismo',
  'Pest Control': 'Control de Plagas',
  'Planting': 'Siembra',
  'Hardscaping': 'Hardscaping',
  'Fertilization': 'Fertilización',
  'Pool Maintenance': 'Mantenimiento de Piscinas',
  'Fencing': 'Cercado',
  'General Maintenance': 'Mantenimiento General',
  'Pressure Washing': 'Lavado a Presión',
  'Garden Design': 'Diseño de Jardines',
};

// Demo job postings shown when no real data exists
const DEMO_JOBS: JobPosting[] = [
  {
    id: 'demo-1',
    title: 'Weekly Lawn Maintenance',
    title_es: 'Mantenimiento Semanal de Césped',
    description: 'Looking for a reliable worker for weekly lawn mowing, edging, and trimming at a residential estate in Escazú. Must have own equipment. Approximately 2,000 sqm property.',
    description_es: 'Se busca trabajador confiable para corte, orillado y recorte semanal de césped en finca residencial en Escazú. Debe tener equipo propio. Propiedad de aprox. 2,000 m².',
    job_type: 'recurring',
    pay_amount: 35000,
    pay_type: 'daily',
    currency: 'CRC',
    schedule_text: 'Every Tuesday, 7am – 12pm',
    location_text: 'Escazú, San José',
    required_skills: ['Lawn Care', 'General Maintenance'],
    status: 'open',
    starts_at: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    org_id: 'demo',
  },
  {
    id: 'demo-2',
    title: 'Irrigation System Repair',
    title_es: 'Reparación de Sistema de Riego',
    description: 'Need experienced irrigation technician to diagnose and repair a sprinkler system with 12 zones. Some valves are leaking and controller needs reprogramming. One-time job.',
    description_es: 'Se necesita técnico de riego con experiencia para diagnosticar y reparar sistema de aspersores de 12 zonas. Algunas válvulas con fugas y controlador necesita reprogramación. Trabajo único.',
    job_type: 'one_time',
    pay_amount: 25,
    pay_type: 'hourly',
    currency: 'USD',
    schedule_text: 'Flexible, this week',
    location_text: 'Santa Ana, San José',
    required_skills: ['Irrigation'],
    status: 'open',
    starts_at: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    org_id: 'demo',
  },
  {
    id: 'demo-3',
    title: 'Garden Design & Planting',
    title_es: 'Diseño de Jardín y Siembra',
    description: 'Looking for a landscaper to design and install a tropical garden area including heliconias, palms, and ground cover. Area is approximately 150 sqm with existing irrigation.',
    description_es: 'Se busca paisajista para diseñar e instalar área de jardín tropical con heliconias, palmas y cobertura de suelo. Área de aprox. 150 m² con riego existente.',
    job_type: 'contract',
    pay_amount: 450000,
    pay_type: 'fixed',
    currency: 'CRC',
    schedule_text: '2-3 weeks project',
    location_text: 'Ciudad Colón, San José',
    required_skills: ['Garden Design', 'Planting', 'Landscaping'],
    status: 'open',
    starts_at: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    org_id: 'demo',
  },
  {
    id: 'demo-4',
    title: 'Tree Trimming – Large Property',
    title_es: 'Poda de Árboles – Propiedad Grande',
    description: 'Annual tree trimming needed for 15+ mature trees including mango, avocado, and several ornamentals. Must have climbing equipment and chainsaw. Safety certified preferred.',
    description_es: 'Se necesita poda anual de 15+ árboles maduros incluyendo mango, aguacate y varios ornamentales. Debe tener equipo de escalada y motosierra. Preferible certificación de seguridad.',
    job_type: 'one_time',
    pay_amount: 18,
    pay_type: 'hourly',
    currency: 'USD',
    schedule_text: 'Next week, full day',
    location_text: 'Atenas, Alajuela',
    required_skills: ['Tree Trimming'],
    status: 'open',
    starts_at: null,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    org_id: 'demo',
  },
  {
    id: 'demo-5',
    title: 'Estate Caretaker – Full Time',
    title_es: 'Cuidador de Finca – Tiempo Completo',
    description: 'Full-time caretaker needed for a 5-hectare estate in Grecia. Duties include lawn maintenance, pool upkeep, pest control, minor repairs, and security. Housing provided on-site.',
    description_es: 'Se necesita cuidador a tiempo completo para finca de 5 hectáreas en Grecia. Funciones incluyen mantenimiento de césped, piscina, control de plagas, reparaciones menores y seguridad. Vivienda incluida.',
    job_type: 'permanent',
    pay_amount: 550000,
    pay_type: 'monthly',
    currency: 'CRC',
    schedule_text: 'Mon–Sat, 6am–3pm',
    location_text: 'Grecia, Alajuela',
    required_skills: ['Lawn Care', 'Pool Maintenance', 'Pest Control', 'General Maintenance'],
    status: 'open',
    starts_at: null,
    created_at: new Date(Date.now() - 0.5 * 86400000).toISOString(),
    org_id: 'demo',
  },
];

export default function JobBoard() {
  const { language } = useLanguage();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const es = language === 'es';

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [applying, setApplying] = useState(false);
  const [myApplications, setMyApplications] = useState<Set<string>>(new Set());

  const isWorker = hasRole('worker_marketplace' as any);

  useEffect(() => {
    fetchJobs();
    if (user) fetchMyApplications();
  }, [user]);

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('job_postings')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    
    const realJobs = (data as any[]) || [];
    // If no real jobs, show demo jobs
    setJobs(realJobs.length > 0 ? realJobs : DEMO_JOBS);
    setLoading(false);
  };

  const fetchMyApplications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('job_applications')
      .select('job_id')
      .eq('worker_id', user.id);
    if (data) setMyApplications(new Set((data as any[]).map(a => a.job_id)));
  };

  const handleApply = async () => {
    if (!user || !selectedJob) {
      toast.error(es ? 'Debes iniciar sesión para aplicar' : 'You must be logged in to apply');
      return;
    }
    if (selectedJob.id.startsWith('demo-')) {
      toast.info(es ? 'Este es un trabajo de demostración' : 'This is a demo job posting');
      setSelectedJob(null);
      return;
    }
    setApplying(true);
    try {
      const { error } = await supabase.from('job_applications').insert({
        job_id: selectedJob.id,
        worker_id: user.id,
        message: applyMessage || null,
        proposed_rate: proposedRate ? parseFloat(proposedRate) : null,
      } as any);
      if (error) throw error;
      toast.success(es ? '¡Aplicación enviada!' : 'Application sent!');
      setMyApplications(prev => new Set([...prev, selectedJob.id]));
      setSelectedJob(null);
      setApplyMessage('');
      setProposedRate('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setApplying(false);
    }
  };

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    return !q || j.title.toLowerCase().includes(q) || j.description.toLowerCase().includes(q) || (j.location_text || '').toLowerCase().includes(q);
  });

  const formatPay = (job: JobPosting) => {
    if (!job.pay_amount) return es ? 'Negociable' : 'Negotiable';
    const sym = job.currency === 'CRC' ? '₡' : '$';
    const typeLabels: Record<string, string> = {
      hourly: es ? '/hora' : '/hr',
      daily: es ? '/día' : '/day',
      monthly: es ? '/mes' : '/mo',
      fixed: es ? ' total' : ' total',
    };
    const suffix = typeLabels[job.pay_type || ''] || '';
    return `${sym}${job.pay_amount.toLocaleString()}${suffix}`;
  };

  const jobTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      one_time: es ? 'Una vez' : 'One-time',
      recurring: es ? 'Recurrente' : 'Recurring',
      contract: es ? 'Contrato' : 'Contract',
      permanent: es ? 'Permanente' : 'Permanent',
    };
    return map[type] || type;
  };

  const jobTypeColor = (type: string) => {
    const map: Record<string, string> = {
      permanent: 'bg-primary/10 text-primary border-primary/20',
      recurring: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
      contract: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      one_time: 'bg-muted text-muted-foreground border-border',
    };
    return map[type] || '';
  };

  const getSkillLabel = (skill: string) => {
    if (es && SKILL_LABELS[skill]) return SKILL_LABELS[skill];
    return skill;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return es ? 'Hace minutos' : 'Just now';
    if (hours < 24) return es ? `Hace ${hours}h` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return es ? 'Ayer' : 'Yesterday';
    return es ? `Hace ${days} días` : `${days}d ago`;
  };

  const isDemo = jobs.length > 0 && jobs[0].id.startsWith('demo-');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary/15 via-background to-accent/10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="/images/hg-logo.png" alt="HG" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
              <span className="text-lg sm:text-xl font-serif font-semibold text-primary">Home Guide</span>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <Button variant="outline" size="sm" onClick={() => navigate('/my-profile')} className="text-xs sm:text-sm">
                  <User className="h-4 w-4 mr-1" />
                  {es ? 'Mi Perfil' : 'My Profile'}
                </Button>
              )}
              {user && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-xs sm:text-sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {es ? 'Inicio' : 'Home'}
                </Button>
              )}
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-foreground mb-2">
            {es ? '🌿 Bolsa de Trabajo' : '🌿 Job Board'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl">
            {es
              ? 'Encuentra trabajos de jardinería y mantenimiento en tu zona.'
              : 'Find landscaping and maintenance jobs in your area.'}
          </p>

          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-4 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {filtered.length} {es ? 'trabajos activos' : 'active jobs'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {es ? 'Costa Rica' : 'Costa Rica'}
            </span>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={es ? 'Buscar por título, lugar o descripción...' : 'Search by title, location, or description...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {user && !isWorker && (
              <Button onClick={() => navigate('/jobs/post')} className="gap-2">
                <Plus className="h-4 w-4" />
                {es ? 'Publicar trabajo' : 'Post a Job'}
              </Button>
            )}
            {!user && (
              <Button onClick={() => navigate('/auth')} className="gap-2">
                <User className="h-4 w-4" />
                {es ? 'Iniciar sesión para aplicar' : 'Sign in to apply'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 text-center text-xs text-accent-foreground">
          {es
            ? '📋 Estos son trabajos de demostración. Los empleadores podrán publicar trabajos reales aquí.'
            : '📋 These are demo job postings. Employers can post real jobs here.'}
        </div>
      )}

      {/* Job listings */}
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">{es ? 'No hay trabajos disponibles' : 'No jobs available'}</p>
              <p className="text-muted-foreground mt-1">
                {es ? 'Revisa más tarde o amplía tu búsqueda' : 'Check back later or broaden your search'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => {
              const alreadyApplied = myApplications.has(job.id);
              return (
                <Card
                  key={job.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                  onClick={() => !alreadyApplied && setSelectedJob(job)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
                              {es && job.title_es ? job.title_es : job.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] sm:text-xs border ${jobTypeColor(job.job_type)}`}>
                              {jobTypeLabel(job.job_type)}
                            </Badge>
                            {alreadyApplied && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs text-primary border-primary gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {es ? 'Aplicado' : 'Applied'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg sm:text-xl font-bold text-primary">{formatPay(job)}</div>
                          <div className="text-[10px] text-muted-foreground">{timeAgo(job.created_at)}</div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {es && job.description_es ? job.description_es : job.description}
                      </p>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {job.location_text && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary/60" /> {job.location_text}
                          </span>
                        )}
                        {job.schedule_text && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-primary/60" /> {job.schedule_text}
                          </span>
                        )}
                      </div>

                      {/* Skills */}
                      {job.required_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.required_skills.map(s => (
                            <Badge key={s} variant="secondary" className="text-[10px] font-normal">{getSkillLabel(s)}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Apply dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">
                  {es && selectedJob.title_es ? selectedJob.title_es : selectedJob.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap gap-2 items-center pt-1">
                  <span className="font-semibold text-primary">{formatPay(selectedJob)}</span>
                  <span>·</span>
                  <span>{jobTypeLabel(selectedJob.job_type)}</span>
                  {selectedJob.location_text && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedJob.location_text}</span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto bg-muted/30 rounded-lg p-3">
                  {es && selectedJob.description_es ? selectedJob.description_es : selectedJob.description}
                </div>
                {selectedJob.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.required_skills.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{getSkillLabel(s)}</Badge>
                    ))}
                  </div>
                )}
                {selectedJob.schedule_text && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" /> {selectedJob.schedule_text}
                  </div>
                )}
                {user ? (
                  <>
                    <div className="space-y-2">
                      <Label>{es ? 'Mensaje (opcional)' : 'Message (optional)'}</Label>
                      <Textarea
                        placeholder={es ? 'Cuéntanos sobre tu experiencia...' : 'Tell us about your experience...'}
                        value={applyMessage}
                        onChange={e => setApplyMessage(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{es ? 'Tarifa propuesta (opcional)' : 'Proposed rate (optional)'}</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={proposedRate}
                        onChange={e => setProposedRate(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 bg-muted/30 rounded-lg">
                    <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {es ? 'Inicia sesión para aplicar a este trabajo' : 'Sign in to apply to this job'}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                {user ? (
                  <Button onClick={handleApply} disabled={applying} className="w-full gap-2">
                    <Send className="h-4 w-4" />
                    {applying ? (es ? 'Enviando...' : 'Sending...') : (es ? 'Enviar Aplicación' : 'Send Application')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/auth')} className="w-full gap-2">
                    <User className="h-4 w-4" />
                    {es ? 'Iniciar sesión' : 'Sign in'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
