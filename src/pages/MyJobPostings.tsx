import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { JobMessageDialog } from '@/components/messaging/JobMessageDialog';
import { Plus, Eye, Users, MessageCircle, CheckCircle, XCircle, Clock, User } from 'lucide-react';

interface Application {
  id: string;
  worker_id: string;
  message: string | null;
  proposed_rate: number | null;
  status: string;
  created_at: string;
}

export default function MyJobPostings() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const es = language === 'es';

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [workerProfiles, setWorkerProfiles] = useState<Record<string, any>>({});
  const [chatTarget, setChatTarget] = useState<{ jobId: string; userId: string; name: string } | null>(null);

  useEffect(() => {
    if (profile?.org_id) fetchJobs();
  }, [profile?.org_id]);

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('job_postings')
      .select('*')
      .eq('org_id', profile!.org_id!)
      .order('created_at', { ascending: false });
    setJobs((data as any[]) || []);
    setLoading(false);
  };

  const openApplications = async (jobId: string) => {
    setSelectedJobId(jobId);
    setLoadingApps(true);
    const { data } = await supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    const apps = (data as any[]) || [];
    setApplications(apps);

    // Fetch worker profiles
    const workerIds = apps.map(a => a.worker_id);
    if (workerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', workerIds);
      const map: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { map[p.id] = p; });
      setWorkerProfiles(map);
    }
    setLoadingApps(false);
  };

  const updateApplicationStatus = async (appId: string, status: string) => {
    const { error } = await supabase.from('job_applications').update({ status } as any).eq('id', appId);
    if (error) { toast.error(error.message); return; }
    toast.success(es ? 'Estado actualizado' : 'Status updated');
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  const closeJob = async (jobId: string) => {
    await supabase.from('job_postings').update({ status: 'closed' } as any).eq('id', jobId);
    toast.success(es ? 'Trabajo cerrado' : 'Job closed');
    fetchJobs();
  };

  const statusColor = (s: string) => {
    if (s === 'open') return 'default';
    if (s === 'closed') return 'secondary';
    if (s === 'filled') return 'outline';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">
            {es ? 'Mis publicaciones de trabajo' : 'My job postings'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {es ? 'Gestiona tus solicitudes de trabajo y revisa aplicaciones' : 'Manage your job requests and review applications'}
          </p>
        </div>
        <Button onClick={() => navigate('/jobs/post')}>
          <Plus className="h-4 w-4 mr-2" />
          {es ? 'Nuevo' : 'New'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">{es ? 'No has publicado trabajos aún' : 'No jobs posted yet'}</p>
            <Button className="mt-4" onClick={() => navigate('/jobs/post')}>
              <Plus className="h-4 w-4 mr-2" />
              {es ? 'Publicar primer trabajo' : 'Post first job'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <Card key={job.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{es && job.title_es ? job.title_es : job.title}</h3>
                    <Badge variant={statusColor(job.status)}>{job.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.location_text || ''} · {new Date(job.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openApplications(job.id)}>
                    <Users className="h-4 w-4 mr-1" />
                    {es ? 'Aplicaciones' : 'Applications'}
                  </Button>
                  {job.status === 'open' && (
                    <Button variant="ghost" size="sm" onClick={() => closeJob(job.id)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Applications dialog */}
      <Dialog open={!!selectedJobId} onOpenChange={() => setSelectedJobId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{es ? 'Aplicaciones recibidas' : 'Applications received'}</DialogTitle>
          </DialogHeader>
          {loadingApps ? (
            <div className="h-20 bg-muted animate-pulse rounded-lg" />
          ) : applications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{es ? 'Sin aplicaciones aún' : 'No applications yet'}</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {applications.map(app => {
                const wp = workerProfiles[app.worker_id];
                return (
                  <Card key={app.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{wp?.full_name || wp?.email || 'Worker'}</p>
                          {app.message && <p className="text-sm text-muted-foreground mt-1">{app.message}</p>}
                          {app.proposed_rate && (
                            <p className="text-sm text-primary font-medium mt-1">
                              {es ? 'Tarifa propuesta' : 'Proposed rate'}: ${app.proposed_rate}
                            </p>
                          )}
                          <Badge variant="outline" className="mt-2 text-xs">{app.status}</Badge>
                        </div>
                        {app.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="default" onClick={() => updateApplicationStatus(app.id, 'accepted')}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updateApplicationStatus(app.id, 'rejected')}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
