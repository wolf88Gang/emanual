import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  DollarSign, 
  Download, 
  Users, 
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, differenceInMinutes, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';

interface WorkerShift {
  id: string;
  user_id: string;
  check_in_at: string;
  check_out_at: string | null;
  notes: string | null;
  user?: {
    full_name: string | null;
    email: string;
  };
}

interface WorkerSummary {
  userId: string;
  userName: string;
  email: string;
  totalMinutes: number;
  totalShifts: number;
  shifts: WorkerShift[];
}

export default function LaborManagement() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<WorkerShift[]>([]);
  const [workerSummaries, setWorkerSummaries] = useState<WorkerSummary[]>([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [hourlyRate, setHourlyRate] = useState(15);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const dateLocale = language === 'es' ? es : undefined;

  useEffect(() => {
    if (currentEstate) {
      fetchShifts();
    }
  }, [currentEstate, weekStart]);

  async function fetchShifts() {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('worker_shifts')
        .select(`
          *,
          user:profiles!worker_shifts_user_id_fkey(full_name, email)
        `)
        .eq('estate_id', currentEstate.id)
        .gte('check_in_at', weekStart.toISOString())
        .lte('check_in_at', weekEnd.toISOString())
        .not('check_out_at', 'is', null)
        .order('check_in_at', { ascending: false });

      if (error) throw error;

      const shiftsData = (data || []) as WorkerShift[];
      setShifts(shiftsData);

      // Calculate worker summaries
      const summaryMap = new Map<string, WorkerSummary>();
      
      shiftsData.forEach(shift => {
        const userId = shift.user_id;
        const userName = shift.user?.full_name || shift.user?.email || 'Unknown';
        const email = shift.user?.email || '';
        
        if (!summaryMap.has(userId)) {
          summaryMap.set(userId, {
            userId,
            userName,
            email,
            totalMinutes: 0,
            totalShifts: 0,
            shifts: []
          });
        }
        
        const summary = summaryMap.get(userId)!;
        const duration = shift.check_out_at 
          ? differenceInMinutes(parseISO(shift.check_out_at), parseISO(shift.check_in_at))
          : 0;
        
        summary.totalMinutes += duration;
        summary.totalShifts += 1;
        summary.shifts.push(shift);
      });

      setWorkerSummaries(Array.from(summaryMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes));
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error(language === 'es' ? 'Error al cargar turnos' : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }

  function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  function calculatePay(minutes: number): number {
    return (minutes / 60) * hourlyRate;
  }

  function exportToPDF() {
    const doc = new jsPDF();
    const isSpanish = language === 'es';
    const margin = 20;
    let yPos = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(
      isSpanish ? 'Reporte de Horas Trabajadas' : 'Labor Hours Report',
      margin,
      yPos
    );
    yPos += 10;

    // Estate and date range
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(currentEstate?.name || '', margin, yPos);
    yPos += 6;
    doc.text(
      `${format(weekStart, 'dd/MM/yyyy', { locale: dateLocale })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: dateLocale })}`,
      margin,
      yPos
    );
    yPos += 6;
    doc.text(
      `${isSpanish ? 'Tarifa por hora:' : 'Hourly rate:'} $${hourlyRate.toFixed(2)}`,
      margin,
      yPos
    );
    yPos += 15;

    // Summary table header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(isSpanish ? 'Trabajador' : 'Worker', margin, yPos);
    doc.text(isSpanish ? 'Turnos' : 'Shifts', margin + 60, yPos);
    doc.text(isSpanish ? 'Horas' : 'Hours', margin + 85, yPos);
    doc.text(isSpanish ? 'Pago' : 'Pay', margin + 115, yPos);
    yPos += 8;

    // Draw line
    doc.setDrawColor(200);
    doc.line(margin, yPos - 3, 190, yPos - 3);

    // Worker rows
    doc.setFont('helvetica', 'normal');
    let totalMinutes = 0;
    let totalPay = 0;

    workerSummaries.forEach(worker => {
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }

      const pay = calculatePay(worker.totalMinutes);
      totalMinutes += worker.totalMinutes;
      totalPay += pay;

      doc.text(worker.userName.substring(0, 25), margin, yPos);
      doc.text(worker.totalShifts.toString(), margin + 60, yPos);
      doc.text(formatMinutes(worker.totalMinutes), margin + 85, yPos);
      doc.text(`$${pay.toFixed(2)}`, margin + 115, yPos);
      yPos += 7;
    });

    // Totals
    yPos += 5;
    doc.setDrawColor(100);
    doc.line(margin, yPos - 3, 190, yPos - 3);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', margin, yPos);
    doc.text(workerSummaries.reduce((acc, w) => acc + w.totalShifts, 0).toString(), margin + 60, yPos);
    doc.text(formatMinutes(totalMinutes), margin + 85, yPos);
    doc.text(`$${totalPay.toFixed(2)}`, margin + 115, yPos);

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128);
      doc.text(
        `${isSpanish ? 'Generado:' : 'Generated:'} ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}`,
        margin,
        285
      );
      doc.text(
        `${isSpanish ? 'Página' : 'Page'} ${i} / ${totalPages}`,
        175,
        285
      );
    }

    // Save
    const filename = `labor-report-${format(weekStart, 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    toast.success(isSpanish ? 'Reporte descargado' : 'Report downloaded');
  }

  const totalHours = workerSummaries.reduce((acc, w) => acc + w.totalMinutes, 0) / 60;
  const totalPayroll = totalHours * hourlyRate;

  return (
    <ModernAppLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold">
              {language === 'es' ? 'Gestión de Nómina' : 'Labor Management'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {language === 'es' 
                ? 'Horas trabajadas, cálculo de pagos y reportes' 
                : 'Worked hours, pay calculations, and reports'}
            </p>
          </div>
          <Button onClick={exportToPDF} disabled={workerSummaries.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {language === 'es' ? 'Exportar PDF' : 'Export PDF'}
          </Button>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="font-medium">
                  {format(weekStart, 'dd MMM', { locale: dateLocale })} - {format(weekEnd, 'dd MMM yyyy', { locale: dateLocale })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Semana laboral' : 'Work week'}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Rate & Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <Label htmlFor="hourly-rate" className="text-xs text-muted-foreground">
                {language === 'es' ? 'Tarifa por hora' : 'Hourly Rate'}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="hourly-rate"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-24"
                  min={0}
                  step={0.5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Users className="h-4 w-4" />
                {language === 'es' ? 'Trabajadores' : 'Workers'}
              </div>
              <p className="text-2xl font-bold mt-1">{workerSummaries.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock className="h-4 w-4" />
                {language === 'es' ? 'Horas Totales' : 'Total Hours'}
              </div>
              <p className="text-2xl font-bold mt-1">{totalHours.toFixed(1)}h</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary text-xs">
                <TrendingUp className="h-4 w-4" />
                {language === 'es' ? 'Nómina Total' : 'Total Payroll'}
              </div>
              <p className="text-2xl font-bold mt-1 text-primary">${totalPayroll.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Worker Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'es' ? 'Resumen por Trabajador' : 'Worker Summary'}
            </CardTitle>
            <CardDescription>
              {language === 'es' 
                ? 'Horas trabajadas y pagos calculados por empleado' 
                : 'Worked hours and calculated pay per employee'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : workerSummaries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'es' ? 'No hay turnos registrados esta semana' : 'No shifts recorded this week'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'es' ? 'Trabajador' : 'Worker'}</TableHead>
                      <TableHead className="text-center">{language === 'es' ? 'Turnos' : 'Shifts'}</TableHead>
                      <TableHead className="text-center">{language === 'es' ? 'Horas' : 'Hours'}</TableHead>
                      <TableHead className="text-right">{language === 'es' ? 'Pago' : 'Pay'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workerSummaries.map((worker) => {
                      const pay = calculatePay(worker.totalMinutes);
                      return (
                        <TableRow key={worker.userId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{worker.userName}</p>
                              <p className="text-xs text-muted-foreground">{worker.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{worker.totalShifts}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {formatMinutes(worker.totalMinutes)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            ${pay.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Shifts */}
        {shifts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'es' ? 'Detalle de Turnos' : 'Shift Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                      <TableHead>{language === 'es' ? 'Trabajador' : 'Worker'}</TableHead>
                      <TableHead>{language === 'es' ? 'Entrada' : 'Check-in'}</TableHead>
                      <TableHead>{language === 'es' ? 'Salida' : 'Check-out'}</TableHead>
                      <TableHead className="text-right">{language === 'es' ? 'Duración' : 'Duration'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift) => {
                      const duration = shift.check_out_at
                        ? differenceInMinutes(parseISO(shift.check_out_at), parseISO(shift.check_in_at))
                        : 0;
                      return (
                        <TableRow key={shift.id}>
                          <TableCell>
                            {format(parseISO(shift.check_in_at), 'dd/MM/yyyy', { locale: dateLocale })}
                          </TableCell>
                          <TableCell>{shift.user?.full_name || shift.user?.email}</TableCell>
                          <TableCell>{format(parseISO(shift.check_in_at), 'HH:mm')}</TableCell>
                          <TableCell>
                            {shift.check_out_at ? format(parseISO(shift.check_out_at), 'HH:mm') : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatMinutes(duration)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ModernAppLayout>
  );
}
