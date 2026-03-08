import React, { useState } from 'react';
import { FileText, Download, Calendar, Loader2, BookOpen, AlertCircle, BarChart3 } from 'lucide-react';
import { MaintenanceDashboard } from '@/components/reports/MaintenanceDashboard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { generateDutyOfCareReport } from '@/lib/pdfExport';
import { ESTATE_MANUAL_SYSTEM_PROMPT, buildEstateDataPrompt } from '@/lib/estateManualPrompt';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Reports() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [generating, setGenerating] = useState(false);
  const [generatingManual, setGeneratingManual] = useState(false);
  const [manualContent, setManualContent] = useState<string | null>(null);
  const [showManualDialog, setShowManualDialog] = useState(false);

  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  async function generateReport() {
    if (!currentEstate) {
      toast.error(language === 'es' ? 'Seleccione una finca' : 'Select an estate');
      return;
    }

    setGenerating(true);
    try {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);

      const { data: completions, error: completionsError } = await supabase
        .from('task_completions')
        .select(`
          *,
          completed_by:profiles!task_completions_completed_by_user_id_fkey(full_name),
          task:tasks(
            title,
            description,
            asset:assets(name),
            zone:zones(name)
          )
        `)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())
        .order('completed_at', { ascending: false });

      if (completionsError) throw completionsError;

      const { data: checkins, error: checkinsError } = await supabase
        .from('checkins')
        .select(`
          *,
          user:profiles!checkins_user_id_fkey(full_name),
          asset:assets(name),
          zone:zones(name)
        `)
        .eq('estate_id', currentEstate.id)
        .gte('checkin_at', startDate.toISOString())
        .lte('checkin_at', endDate.toISOString())
        .order('checkin_at', { ascending: false });

      if (checkinsError) throw checkinsError;

      await generateDutyOfCareReport({
        estateName: currentEstate.name,
        startDate,
        endDate,
        completions: completions || [],
        checkins: checkins || [],
        language: language as 'en' | 'es',
      });

      toast.success(language === 'es' ? '✅ Informe generado' : '✅ Report generated');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(error.message || (language === 'es' ? 'Error al generar' : 'Generation failed'));
    } finally {
      setGenerating(false);
    }
  }

  async function generateEstateManual() {
    if (!currentEstate) {
      toast.error(language === 'es' ? 'Seleccione una finca' : 'Select an estate');
      return;
    }

    setGeneratingManual(true);
    setManualContent(null);

    try {
      // Fetch all data in parallel
      const [
        zonesRes,
        assetsRes,
        tasksRes,
        completionsRes,
        checkinsRes,
        documentsRes,
        alertsRes,
      ] = await Promise.all([
        supabase
          .from('zones')
          .select('*')
          .eq('estate_id', currentEstate.id)
          .order('name'),
        supabase
          .from('assets')
          .select('*')
          .eq('estate_id', currentEstate.id)
          .order('name'),
        supabase
          .from('tasks')
          .select('*')
          .eq('estate_id', currentEstate.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('task_completions')
          .select(`
            *,
            completed_by:profiles!task_completions_completed_by_user_id_fkey(full_name),
            task:tasks(
              id,
              title,
              asset_id,
              zone_id,
              asset:assets(name),
              zone:zones(name)
            )
          `)
          .order('completed_at', { ascending: false })
          .limit(200),
        supabase
          .from('checkins')
          .select(`
            *,
            user:profiles!checkins_user_id_fkey(full_name),
            asset:assets(name),
            zone:zones(name)
          `)
          .eq('estate_id', currentEstate.id)
          .order('checkin_at', { ascending: false })
          .limit(100),
        supabase
          .from('documents')
          .select('*')
          .eq('estate_id', currentEstate.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('weather_alerts')
          .select('*')
          .eq('estate_id', currentEstate.id)
          .order('fired_at', { ascending: false })
          .limit(50),
      ]);

      const dataPrompt = buildEstateDataPrompt({
        estateName: currentEstate.name,
        estateAddress: currentEstate.address_text,
        estateCountry: currentEstate.country,
        generationDate: format(new Date(), 'yyyy-MM-dd HH:mm'),
        zones: zonesRes.data || [],
        assets: assetsRes.data || [],
        tasks: tasksRes.data || [],
        completions: completionsRes.data || [],
        checkins: checkinsRes.data || [],
        documents: documentsRes.data || [],
        weatherAlerts: alertsRes.data || [],
        language: language as 'en' | 'es',
      });

      const { data, error } = await supabase.functions.invoke('generate-estate-manual', {
        body: {
          systemPrompt: ESTATE_MANUAL_SYSTEM_PROMPT,
          dataPrompt,
        },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error === 'rate_limit') {
          toast.error(
            language === 'es'
              ? 'Límite de solicitudes excedido. Intente más tarde.'
              : 'Rate limit exceeded. Please try again later.'
          );
          return;
        }
        if (data.error === 'payment_required') {
          toast.error(
            language === 'es'
              ? 'Créditos de IA agotados. Por favor, agregue fondos.'
              : 'AI credits exhausted. Please add funds.'
          );
          return;
        }
        throw new Error(data.message || 'Generation failed');
      }

      setManualContent(data.manual);
      setShowManualDialog(true);
      toast.success(
        language === 'es' ? '✅ Manual generado exitosamente' : '✅ Manual generated successfully'
      );
    } catch (error: any) {
      console.error('Error generating estate manual:', error);
      toast.error(
        error.message || (language === 'es' ? 'Error al generar manual' : 'Failed to generate manual')
      );
    } finally {
      setGeneratingManual(false);
    }
  }

  function downloadManualAsMarkdown() {
    if (!manualContent || !currentEstate) return;

    const blob = new Blob([manualContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manual-${currentEstate.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(language === 'es' ? 'Manual descargado' : 'Manual downloaded');
  }

  return (
    <ModernAppLayout>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">
            {language === 'es' ? 'Informes' : 'Reports'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {language === 'es'
              ? 'Genera informes de deber de cuidado y manuales integrales'
              : 'Generate duty-of-care reports and comprehensive estate manuals'}
          </p>
        </div>

        <Tabs defaultValue="maintenance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="maintenance" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {language === 'es' ? 'Mantenimiento' : 'Maintenance'}
            </TabsTrigger>
            <TabsTrigger value="duty-of-care" className="gap-2">
              <FileText className="h-4 w-4" />
              {language === 'es' ? 'Deber de Cuidado' : 'Duty of Care'}
            </TabsTrigger>
            <TabsTrigger value="estate-manual" className="gap-2">
              <BookOpen className="h-4 w-4" />
              {language === 'es' ? 'Manual' : 'Manual'}
            </TabsTrigger>
          </TabsList>

          {/* Maintenance Analytics */}
          <TabsContent value="maintenance">
            <MaintenanceDashboard />
          </TabsContent>

          {/* Duty of Care Report */}
          <TabsContent value="duty-of-care">
            <Card className="estate-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {language === 'es' ? 'Informe de Deber de Cuidado' : 'Duty of Care Report'}
                </CardTitle>
                <CardDescription>
                  {language === 'es'
                    ? 'Incluye tareas completadas, registros de campo, y evidencia fotográfica'
                    : 'Includes completed tasks, field check-ins, and photo evidence'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">
                      {language === 'es' ? 'Fecha Inicio' : 'Start Date'}
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">
                      {language === 'es' ? 'Fecha Fin' : 'End Date'}
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={generateReport}
                  disabled={generating || !currentEstate}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {language === 'es' ? 'Generando...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      {language === 'es' ? 'Generar PDF' : 'Generate PDF'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estate Manual */}
          <TabsContent value="estate-manual">
            <Card className="estate-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {language === 'es' ? 'Manual Integral de la Propiedad' : 'Comprehensive Estate Manual'}
                </CardTitle>
                <CardDescription>
                  {language === 'es'
                    ? 'Documento técnico completo para continuidad operativa, traspaso a nuevos dueños, auditorías y respaldo ante aseguradoras'
                    : 'Complete technical document for operational continuity, ownership transfer, audits, and insurance compliance'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                  <h4 className="font-medium text-sm">
                    {language === 'es' ? 'El manual incluye:' : 'The manual includes:'}
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • {language === 'es' ? 'Portada y resumen ejecutivo' : 'Cover page and executive summary'}
                    </li>
                    <li>
                      •{' '}
                      {language === 'es'
                        ? 'Descripción espacial completa de zonas'
                        : 'Complete spatial description of zones'}
                    </li>
                    <li>
                      •{' '}
                      {language === 'es'
                        ? 'Inventario integral de activos con fichas técnicas'
                        : 'Comprehensive asset inventory with technical sheets'}
                    </li>
                    <li>
                      •{' '}
                      {language === 'es'
                        ? 'Historial detallado de intervenciones por activo'
                        : 'Detailed intervention history per asset'}
                    </li>
                    <li>
                      •{' '}
                      {language === 'es'
                        ? 'Rutinas de mantenimiento y frecuencias'
                        : 'Maintenance routines and frequencies'}
                    </li>
                    <li>
                      •{' '}
                      {language === 'es'
                        ? 'Índice de documentación de soporte'
                        : 'Supporting documentation index'}
                    </li>
                  </ul>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <p className="text-sm text-warning">
                    {language === 'es'
                      ? 'Este proceso puede tardar 30-60 segundos. El manual se genera con IA a partir de los registros verificados del sistema.'
                      : 'This process may take 30-60 seconds. The manual is AI-generated from verified system records.'}
                  </p>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={generateEstateManual}
                  disabled={generatingManual || !currentEstate}
                >
                  {generatingManual ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {language === 'es' ? 'Generando manual...' : 'Generating manual...'}
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      {language === 'es' ? 'Generar Manual Integral' : 'Generate Estate Manual'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Manual Preview Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {language === 'es' ? 'Manual Integral de la Propiedad' : 'Comprehensive Estate Manual'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="prose prose-sm dark:prose-invert max-w-none pb-6">
              {manualContent && <ReactMarkdown>{manualContent}</ReactMarkdown>}
            </div>
          </ScrollArea>

          <div className="p-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>
              {language === 'es' ? 'Cerrar' : 'Close'}
            </Button>
            <Button onClick={downloadManualAsMarkdown}>
              <Download className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Descargar Markdown' : 'Download Markdown'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ModernAppLayout>
  );
}
