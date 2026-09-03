import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Seo } from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Access is invitation-only: prospective customers describe their operation and
 * the Home Guide team contacts them. No self-service account creation.
 */
const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  company_name: z.string().trim().max(160).optional().or(z.literal('')),
  country: z.string().trim().max(80).optional().or(z.literal('')),
  operation_type: z.string().min(1),
  team_size: z.string().trim().max(40).optional().or(z.literal('')),
  sites_count: z.string().trim().max(40).optional().or(z.literal('')),
  current_tools: z.string().trim().max(500).optional().or(z.literal('')),
  needs: z.string().trim().min(10).max(2000),
});

type FormData = z.infer<typeof schema>;

const OPERATION_TYPES = [
  { value: 'property_management', en: 'Property / villa management', es: 'Administración de propiedades / villas', de: 'Immobilien- / Villenverwaltung' },
  { value: 'landscaping', en: 'Landscaping / grounds maintenance', es: 'Paisajismo / mantenimiento de jardines', de: 'Garten- / Landschaftspflege' },
  { value: 'plant_rental', en: 'Plant rental / interior plants', es: 'Alquiler de plantas / plantas interiores', de: 'Pflanzenvermietung / Innenraumpflanzen' },
  { value: 'estate_owner', en: 'Estate or home owner', es: 'Propietario de finca o casa', de: 'Eigentümer eines Anwesens oder Hauses' },
  { value: 'other', en: 'Other operation', es: 'Otra operación', de: 'Anderer Betrieb' },
];

export default function RequestAccess() {
  const { language } = useLanguage();
  const l = (en: string, es: string, de: string) => (language === 'es' ? es : language === 'de' ? de : en);
  const [submitted, setSubmitted] = useState(false);
  const [operationType, setOperationType] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('access_requests' as any).insert({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        company_name: data.company_name || null,
        country: data.country || null,
        operation_type: data.operation_type,
        team_size: data.team_size || null,
        sites_count: data.sites_count || null,
        current_tools: data.current_tools || null,
        needs: data.needs,
        preferred_language: language,
        status: 'new',
      } as any);
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      toast.error(
        l(
          'We could not send your request. Please try again.',
          'No pudimos enviar su solicitud. Intente de nuevo.',
          'Ihre Anfrage konnte nicht gesendet werden. Bitte erneut versuchen.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={l('Request access — Home Guide', 'Solicitar acceso — Home Guide', 'Zugang anfragen — Home Guide')}
        description={l(
          'Home Guide is invitation-only. Tell us about your operation and our team will contact you.',
          'Home Guide es por invitación. Cuéntenos sobre su operación y nuestro equipo lo contactará.',
          'Home Guide ist nur auf Einladung. Erzählen Sie uns von Ihrem Betrieb, wir melden uns.',
        )}
        path="/request-access"
      />

      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {l('Back', 'Volver', 'Zurück')}
        </Link>
        <LanguagePicker />
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        {submitted ? (
          <Card className="animate-rise-in text-center">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h1 className="font-display text-2xl font-semibold">
                {l('Request received', 'Solicitud recibida', 'Anfrage erhalten')}
              </h1>
              <p className="max-w-md text-sm text-muted-foreground">
                {l(
                  'Thank you. Our team reviews every operation individually and will contact you by email to arrange a walkthrough.',
                  'Gracias. Nuestro equipo revisa cada operación de forma individual y lo contactará por correo para coordinar una demostración.',
                  'Vielen Dank. Unser Team prüft jeden Betrieb einzeln und meldet sich per E-Mail für eine Vorstellung.',
                )}
              </p>
              <Button asChild variant="outline">
                <Link to="/">{l('Back to home', 'Volver al inicio', 'Zur Startseite')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="animate-rise-in">
            <CardHeader>
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {l('Invitation only', 'Solo por invitación', 'Nur auf Einladung')}
              </p>
              <CardTitle className="font-display text-2xl">
                {l('Request access', 'Solicitar acceso', 'Zugang anfragen')}
              </CardTitle>
              <CardDescription>
                {l(
                  'Accounts are created by our team after a short review. Tell us about your operation and we will contact you.',
                  'Las cuentas las crea nuestro equipo después de una breve revisión. Cuéntenos sobre su operación y lo contactaremos.',
                  'Konten werden nach einer kurzen Prüfung von unserem Team erstellt. Beschreiben Sie Ihren Betrieb, wir melden uns.',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">{l('Full name', 'Nombre completo', 'Vollständiger Name')} *</Label>
                    <Input id="full_name" {...register('full_name')} maxLength={120} />
                    {errors.full_name && <p className="text-xs text-destructive">{l('Required', 'Requerido', 'Erforderlich')}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{l('Work email', 'Correo de trabajo', 'Arbeits-E-Mail')} *</Label>
                    <Input id="email" type="email" {...register('email')} maxLength={255} />
                    {errors.email && <p className="text-xs text-destructive">{l('Valid email required', 'Correo válido requerido', 'Gültige E-Mail erforderlich')}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{l('Phone / WhatsApp', 'Teléfono / WhatsApp', 'Telefon / WhatsApp')}</Label>
                    <Input id="phone" {...register('phone')} maxLength={40} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company_name">{l('Company', 'Empresa', 'Unternehmen')}</Label>
                    <Input id="company_name" {...register('company_name')} maxLength={160} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country">{l('Country / region', 'País / región', 'Land / Region')}</Label>
                    <Input id="country" {...register('country')} maxLength={80} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{l('Type of operation', 'Tipo de operación', 'Art des Betriebs')} *</Label>
                    <Select
                      value={operationType}
                      onValueChange={(v) => {
                        setOperationType(v);
                        setValue('operation_type', v, { shouldValidate: true });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={l('Select', 'Seleccione', 'Auswählen')} />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATION_TYPES.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {l(o.en, o.es, o.de)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.operation_type && <p className="text-xs text-destructive">{l('Required', 'Requerido', 'Erforderlich')}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="team_size">{l('People in your team', 'Personas en su equipo', 'Personen im Team')}</Label>
                    <Input id="team_size" {...register('team_size')} maxLength={40} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sites_count">
                      {l('Properties / sites you manage', 'Propiedades / sitios que gestiona', 'Verwaltete Objekte / Standorte')}
                    </Label>
                    <Input id="sites_count" {...register('sites_count')} maxLength={40} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="current_tools">
                    {l('What do you use today?', '¿Qué usa actualmente?', 'Was nutzen Sie heute?')}
                  </Label>
                  <Input id="current_tools" {...register('current_tools')} maxLength={500} placeholder={l('WhatsApp, spreadsheets, paper…', 'WhatsApp, hojas de cálculo, papel…', 'WhatsApp, Tabellen, Papier…')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="needs">
                    {l('What do you need to solve?', '¿Qué necesita resolver?', 'Was möchten Sie lösen?')} *
                  </Label>
                  <Textarea id="needs" rows={5} {...register('needs')} maxLength={2000} />
                  {errors.needs && (
                    <p className="text-xs text-destructive">
                      {l('Please describe your operation (min. 10 characters).', 'Describa su operación (mín. 10 caracteres).', 'Bitte beschreiben Sie Ihren Betrieb (min. 10 Zeichen).')}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? l('Sending…', 'Enviando…', 'Senden…')
                    : l('Send request', 'Enviar solicitud', 'Anfrage senden')}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  {l('Already have an account?', '¿Ya tiene una cuenta?', 'Sie haben bereits ein Konto?')}{' '}
                  <Link to="/auth" className="font-medium text-primary hover:underline">
                    {l('Sign in', 'Iniciar sesión', 'Anmelden')}
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
