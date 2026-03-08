import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import {
  ArrowLeft, Star, MapPin, Clock, Briefcase, MessageSquare, Send,
  User, Award, CheckCircle2, Calendar
} from 'lucide-react';

interface WorkerProfile {
  id: string;
  user_id: string;
  bio: string | null;
  bio_es: string | null;
  skills: string[];
  hourly_rate: number | null;
  currency: string;
  service_zone_text: string | null;
  rating_avg: number;
  rating_count: number;
  available: boolean;
  portfolio_urls: string[];
  profiles?: { full_name: string | null; email: string; avatar_url: string | null };
}

interface Rating {
  id: string;
  score: number;
  comment: string | null;
  created_at: string;
  job_id: string;
  from_user_id: string;
  job_postings?: { title: string };
}

interface CompletedJob {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  job_postings?: { title: string; title_es: string | null; job_type: string; pay_amount: number | null; currency: string; location_text: string | null };
}

export default function WorkerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const es = language === 'es';

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: wp } = await supabase
        .from('worker_profiles')
        .select('*, profiles:user_id(full_name, email, avatar_url)')
        .eq('user_id', id!)
        .single();
      if (wp) setProfile(wp as any);

      const { data: r } = await supabase
        .from('job_ratings')
        .select('*, job_postings:job_id(title)')
        .eq('to_user_id', id!)
        .order('created_at', { ascending: false });
      setRatings((r as any[]) || []);

      const { data: jobs } = await supabase
        .from('job_applications')
        .select('*, job_postings:job_id(title, title_es, job_type, pay_amount, currency, location_text)')
        .eq('worker_id', id!)
        .eq('status', 'accepted')
        .order('updated_at', { ascending: false });
      setCompletedJobs((jobs as any[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !profile || !message.trim()) return;
    toast.success(es ? 'Mensaje enviado' : 'Message sent');
    setShowMessage(false);
    setMessage('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{es ? 'Cargando...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{es ? 'Perfil no encontrado' : 'Profile not found'}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />{es ? 'Volver' : 'Go back'}
        </Button>
      </div>
    );
  }

  const name = (profile.profiles as any)?.full_name || (profile.profiles as any)?.email || 'Worker';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/5 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />{es ? 'Volver' : 'Back'}
          </Button>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-serif font-bold">{name}</h1>
                {profile.available && (
                  <Badge className="bg-success/20 text-success border-success/30 text-xs">
                    {es ? 'Disponible' : 'Available'}
                  </Badge>
                )}
              </div>

              {profile.service_zone_text && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5" />{profile.service_zone_text}
                </p>
              )}

              <div className="flex items-center gap-4 mt-2 text-sm">
                {profile.rating_count > 0 && (
                  <span className="flex items-center gap-1 text-accent">
                    <Star className="h-4 w-4 fill-current" />
                    {Number(profile.rating_avg).toFixed(1)} ({profile.rating_count})
                  </span>
                )}
                {profile.hourly_rate && (
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    {formatCurrency(profile.hourly_rate, profile.currency)}/hr
                  </span>
                )}
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  {completedJobs.length} {es ? 'trabajos' : 'jobs'}
                </span>
              </div>
            </div>
          </div>

          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {profile.skills.map(s => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          )}

          {(profile.bio || profile.bio_es) && (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {es && profile.bio_es ? profile.bio_es : profile.bio}
            </p>
          )}

          {user && user.id !== profile.user_id && (
            <Button className="mt-4" onClick={() => setShowMessage(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />{es ? 'Contactar' : 'Contact'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Tabs defaultValue="jobs">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-3.5 w-3.5" />
              {es ? 'Trabajos' : 'Jobs'} ({completedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="h-3.5 w-3.5" />
              {es ? 'Reseñas' : 'Reviews'} ({ratings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4 space-y-3">
            {completedJobs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {es ? 'Sin historial de trabajos aún' : 'No job history yet'}
                </CardContent>
              </Card>
            ) : completedJobs.map(job => (
              <Card key={job.id} className="estate-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium">
                        {es && (job.job_postings as any)?.title_es
                          ? (job.job_postings as any).title_es
                          : (job.job_postings as any)?.title}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(job.updated_at).toLocaleDateString()}
                        </span>
                        {(job.job_postings as any)?.location_text && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{(job.job_postings as any).location_text}
                          </span>
                        )}
                      </div>
                    </div>
                    {(job.job_postings as any)?.pay_amount && (
                      <span className="text-sm font-semibold text-primary">
                        {formatCurrency((job.job_postings as any).pay_amount, (job.job_postings as any).currency)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3">
            {ratings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {es ? 'Sin reseñas aún' : 'No reviews yet'}
                </CardContent>
              </Card>
            ) : ratings.map(r => (
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
                  {(r.job_postings as any)?.title && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {es ? 'Trabajo:' : 'Job:'} {(r.job_postings as any).title}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Dialog */}
      <Dialog open={showMessage} onOpenChange={setShowMessage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{es ? 'Contactar a' : 'Contact'} {name}</DialogTitle>
            <DialogDescription>{es ? 'Envía un mensaje directo' : 'Send a direct message'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{es ? 'Mensaje' : 'Message'}</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={es ? 'Escribe tu mensaje...' : 'Write your message...'}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button onClick={sendMessage} disabled={!message.trim()}>
              <Send className="h-4 w-4 mr-2" />{es ? 'Enviar' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
