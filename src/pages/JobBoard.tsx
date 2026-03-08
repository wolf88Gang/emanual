import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, MapPin, DollarSign, Clock, Briefcase, Send, Plus, ArrowLeft, Star } from 'lucide-react';

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
    setJobs((data as any[]) || []);
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
    const typeLabel = job.pay_type === 'hourly' ? (es ? '/hr' : '/hr') : job.pay_type === 'daily' ? (es ? '/día' : '/day') : '';
    return `${sym}${job.pay_amount.toLocaleString()}${typeLabel}`;
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-4">
            <img src="/images/hg-logo.png" alt="HG" className="w-10 h-10 object-contain" />
            <span className="text-xl font-serif font-semibold text-primary">Home Guide</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-2">
            {es ? 'Bolsa de Trabajo' : 'Job Board'}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            {es
              ? 'Encuentra trabajos de jardinería y mantenimiento en tu zona. Aplica directamente y conecta con propietarios.'
              : 'Find landscaping and maintenance jobs in your area. Apply directly and connect with property owners.'}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={es ? 'Buscar trabajos...' : 'Search jobs...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {user && !isWorker && (
              <Button onClick={() => navigate('/jobs/post')}>
                <Plus className="h-4 w-4 mr-2" />
                {es ? 'Publicar trabajo' : 'Post a job'}
              </Button>
            )}
            {!user && (
              <Button onClick={() => navigate('/auth')}>
                {es ? 'Iniciar sesión' : 'Sign in'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Job listings */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {filtered.length} {es ? 'trabajos encontrados' : 'jobs found'}
            </p>
            {filtered.map(job => {
              const alreadyApplied = myApplications.has(job.id);
              return (
                <Card
                  key={job.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => !alreadyApplied && setSelectedJob(job)}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {es && job.title_es ? job.title_es : job.title}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {jobTypeLabel(job.job_type)}
                          </Badge>
                          {alreadyApplied && (
                            <Badge variant="outline" className="text-xs text-primary border-primary">
                              {es ? 'Aplicado ✓' : 'Applied ✓'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {es && job.description_es ? job.description_es : job.description}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {job.location_text && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {job.location_text}
                            </span>
                          )}
                          {job.schedule_text && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {job.schedule_text}
                            </span>
                          )}
                        </div>
                        {job.required_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {job.required_skills.map(s => (
                              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-bold text-primary">{formatPay(job)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(job.created_at).toLocaleDateString()}
                        </div>
                      </div>
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
        <DialogContent className="sm:max-w-lg">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle>{es && selectedJob.title_es ? selectedJob.title_es : selectedJob.title}</DialogTitle>
                <DialogDescription>
                  {formatPay(selectedJob)} · {jobTypeLabel(selectedJob.job_type)}
                  {selectedJob.location_text && ` · ${selectedJob.location_text}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {es && selectedJob.description_es ? selectedJob.description_es : selectedJob.description}
                </div>
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
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {es ? 'Inicia sesión para aplicar a este trabajo' : 'Sign in to apply to this job'}
                  </p>
                )}
              </div>
              <DialogFooter>
                {user ? (
                  <Button onClick={handleApply} disabled={applying} className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    {applying ? (es ? 'Enviando...' : 'Sending...') : (es ? 'Enviar aplicación' : 'Send application')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/auth')} className="w-full">
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
