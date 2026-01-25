 import React, { useState } from 'react';
 import { FileText, Download, Calendar, Loader2 } from 'lucide-react';
 import { useLanguage } from '@/contexts/LanguageContext';
 import { useEstate } from '@/contexts/EstateContext';
 import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Label } from '@/components/ui/label';
 import { Input } from '@/components/ui/input';
 import { supabase } from '@/integrations/supabase/client';
 import { generateDutyOfCareReport } from '@/lib/pdfExport';
 import { toast } from 'sonner';
 import { format, subDays } from 'date-fns';
 
 export default function Reports() {
   const { language } = useLanguage();
   const { currentEstate } = useEstate();
   const [generating, setGenerating] = useState(false);
   
   const [dateRange, setDateRange] = useState({
     start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
     end: format(new Date(), 'yyyy-MM-dd')
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
 
       // Fetch task completions
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
 
       // Fetch check-ins
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
 
       // Generate PDF
       await generateDutyOfCareReport({
         estateName: currentEstate.name,
         startDate,
         endDate,
         completions: completions || [],
         checkins: checkins || [],
         language: language as 'en' | 'es'
       });
 
       toast.success(language === 'es' ? '✅ Informe generado' : '✅ Report generated');
     } catch (error: any) {
       console.error('Error generating report:', error);
       toast.error(error.message || (language === 'es' ? 'Error al generar' : 'Generation failed'));
     } finally {
       setGenerating(false);
     }
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
               ? 'Genera informes de deber de cuidado para seguros y auditorías' 
               : 'Generate duty-of-care reports for insurance and audits'}
           </p>
         </div>
 
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
                   onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
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
                   onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
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
       </div>
     </ModernAppLayout>
   );
 }