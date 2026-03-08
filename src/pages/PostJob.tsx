import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Send } from 'lucide-react';

export default function PostJob() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const navigate = useNavigate();
  const es = language === 'es';

  const [title, setTitle] = useState('');
  const [titleEs, setTitleEs] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionEs, setDescriptionEs] = useState('');
  const [jobType, setJobType] = useState('one_time');
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState('fixed');
  const [currency, setCurrency] = useState('USD');
  const [schedule, setSchedule] = useState('');
  const [location, setLocation] = useState(currentEstate?.address_text || '');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error(es ? 'Título y descripción son requeridos' : 'Title and description are required');
      return;
    }
    if (!profile?.org_id) {
      toast.error(es ? 'No tienes una organización configurada' : 'No organization configured');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('job_postings').insert({
        org_id: profile.org_id,
        estate_id: currentEstate?.id || null,
        title: title.trim(),
        title_es: titleEs.trim() || null,
        description: description.trim(),
        description_es: descriptionEs.trim() || null,
        job_type: jobType,
        pay_amount: payAmount ? parseFloat(payAmount) : null,
        pay_type: payType,
        currency,
        schedule_text: schedule || null,
        location_text: location || null,
        location_lat: currentEstate?.lat || null,
        location_lng: currentEstate?.lng || null,
        required_skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        created_by: user?.id,
      } as any);
      if (error) throw error;
      toast.success(es ? '¡Trabajo publicado!' : 'Job posted!');
      navigate('/jobs');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/jobs')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {es ? 'Volver' : 'Back'}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-serif">
              {es ? 'Publicar trabajo' : 'Post a job'}
            </CardTitle>
            <CardDescription>
              {es
                ? 'Publica una solicitud de trabajo visible para trabajadores en la plataforma'
                : 'Post a job request visible to workers on the platform'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{es ? 'Título (EN) *' : 'Title (EN) *'}</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Garden maintenance" />
              </div>
              <div className="space-y-2">
                <Label>{es ? 'Título (ES)' : 'Title (ES)'}</Label>
                <Input value={titleEs} onChange={e => setTitleEs(e.target.value)} placeholder="Mantenimiento de jardín" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{es ? 'Descripción *' : 'Description *'}</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                placeholder={es ? 'Describe el trabajo, requisitos y expectativas...' : 'Describe the job, requirements and expectations...'} />
            </div>
            <div className="space-y-2">
              <Label>{es ? 'Descripción (ES)' : 'Description (ES)'}</Label>
              <Textarea value={descriptionEs} onChange={e => setDescriptionEs(e.target.value)} rows={3}
                placeholder="Descripción en español..." />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{es ? 'Tipo' : 'Type'}</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">{es ? 'Una vez' : 'One-time'}</SelectItem>
                    <SelectItem value="recurring">{es ? 'Recurrente' : 'Recurring'}</SelectItem>
                    <SelectItem value="contract">{es ? 'Contrato' : 'Contract'}</SelectItem>
                    <SelectItem value="permanent">{es ? 'Permanente' : 'Permanent'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{es ? 'Pago' : 'Pay'}</Label>
                <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>{es ? 'Tipo pago' : 'Pay type'}</Label>
                <Select value={payType} onValueChange={setPayType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">{es ? 'Fijo' : 'Fixed'}</SelectItem>
                    <SelectItem value="hourly">{es ? 'Por hora' : 'Hourly'}</SelectItem>
                    <SelectItem value="daily">{es ? 'Diario' : 'Daily'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{es ? 'Moneda' : 'Currency'}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CRC">CRC ₡</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{es ? 'Horario' : 'Schedule'}</Label>
                <Input value={schedule} onChange={e => setSchedule(e.target.value)}
                  placeholder={es ? 'Lun-Vie 7am-3pm' : 'Mon-Fri 7am-3pm'} />
              </div>
              <div className="space-y-2">
                <Label>{es ? 'Ubicación' : 'Location'}</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder={es ? 'San José, Costa Rica' : 'San José, Costa Rica'} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{es ? 'Habilidades requeridas (separadas por coma)' : 'Required skills (comma separated)'}</Label>
              <Input value={skills} onChange={e => setSkills(e.target.value)}
                placeholder={es ? 'poda, riego, paisajismo' : 'pruning, irrigation, landscaping'} />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full" size="lg">
              <Send className="h-4 w-4 mr-2" />
              {loading ? (es ? 'Publicando...' : 'Posting...') : (es ? 'Publicar trabajo' : 'Post job')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
