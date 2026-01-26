import React, { useState } from 'react';
import { Download, Loader2, Clock, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';

// Labor components
import { useLaborData } from '@/components/labor/useLaborData';
import { WeekNavigator } from '@/components/labor/WeekNavigator';
import { RateConfigCard } from '@/components/labor/RateConfigCard';
import { WeekSummaryCard } from '@/components/labor/WeekSummaryCard';
import { WorkerShiftCard } from '@/components/labor/WorkerShiftCard';
import { ValidationModal } from '@/components/labor/ValidationModal';
import { PaymentModal } from '@/components/labor/PaymentModal';
import type { WorkerShift, Currency, RateType, ValidationStatus, DecisionType } from '@/components/labor/types';

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export default function LaborManagement() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Rate configuration
  const [currency, setCurrency] = useState<Currency>('USD');
  const [rateType, setRateType] = useState<RateType>('hourly');
  const [rateAmount, setRateAmount] = useState(15);

  // Modals
  const [validatingShift, setValidatingShift] = useState<WorkerShift | null>(null);
  const [payingShift, setPayingShift] = useState<WorkerShift | null>(null);

  const { 
    loading, 
    workerSummaries, 
    updateValidation, 
    recordPayment 
  } = useLaborData(weekStart, language);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const dateLocale = language === 'es' ? es : undefined;
  const currencySymbol = currency === 'CRC' ? '₡' : '$';

  const handleValidation = (
    shiftId: string,
    status: ValidationStatus,
    decisionType: DecisionType,
    adjustedMinutes: number | null,
    originalMinutes: number,
    message: string,
    aiMessage: string
  ) => {
    updateValidation(shiftId, status, decisionType, adjustedMinutes, originalMinutes, message, aiMessage);
  };

  const handlePayment = (
    shiftId: string,
    validationId: string | null,
    amount: number,
    paymentCurrency: Currency,
    paymentMethod: string,
    paymentDate: string,
    reference: string | null,
    notes: string | null
  ) => {
    recordPayment(shiftId, validationId, amount, paymentCurrency, paymentMethod, paymentDate, reference, notes);
  };

  function exportToPDF() {
    const doc = new jsPDF();
    const isSpanish = language === 'es';
    const margin = 20;
    let yPos = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(
      isSpanish ? 'Reporte de Nómina Laboral' : 'Labor Payroll Report',
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
      `${isSpanish ? 'Tarifa:' : 'Rate:'} ${currencySymbol}${rateAmount.toFixed(2)}/${rateType === 'hourly' ? 'hr' : 'día'}`,
      margin,
      yPos
    );
    yPos += 15;

    // Summary table header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(isSpanish ? 'Trabajador' : 'Worker', margin, yPos);
    doc.text(isSpanish ? 'Turnos' : 'Shifts', margin + 55, yPos);
    doc.text(isSpanish ? 'Total' : 'Total', margin + 75, yPos);
    doc.text(isSpanish ? 'Aprobado' : 'Approved', margin + 95, yPos);
    doc.text(isSpanish ? 'Pagado' : 'Paid', margin + 125, yPos);
    doc.text(isSpanish ? 'Pendiente' : 'Pending', margin + 155, yPos);
    yPos += 8;

    doc.setDrawColor(200);
    doc.line(margin, yPos - 3, 190, yPos - 3);

    // Worker rows
    doc.setFont('helvetica', 'normal');
    let totalApproved = 0;
    let totalPaid = 0;

    workerSummaries.forEach(worker => {
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }

      const approvedPay = (worker.approvedMinutes / 60) * rateAmount;
      const paidPay = (worker.paidMinutes / 60) * rateAmount;
      totalApproved += approvedPay;
      totalPaid += paidPay;

      doc.text(worker.userName.substring(0, 20), margin, yPos);
      doc.text(worker.totalShifts.toString(), margin + 55, yPos);
      doc.text(formatMinutes(worker.totalMinutes), margin + 75, yPos);
      doc.text(`${currencySymbol}${approvedPay.toFixed(2)}`, margin + 95, yPos);
      doc.text(`${currencySymbol}${paidPay.toFixed(2)}`, margin + 125, yPos);
      doc.text(`${worker.pendingShifts}`, margin + 155, yPos);
      yPos += 7;
    });

    // Totals
    yPos += 5;
    doc.setDrawColor(100);
    doc.line(margin, yPos - 3, 190, yPos - 3);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', margin, yPos);
    doc.text(`${currencySymbol}${totalApproved.toFixed(2)}`, margin + 95, yPos);
    doc.text(`${currencySymbol}${totalPaid.toFixed(2)}`, margin + 125, yPos);

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
      doc.text(`${isSpanish ? 'Página' : 'Page'} ${i} / ${totalPages}`, 175, 285);
    }

    const filename = `labor-report-${format(weekStart, 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    toast.success(isSpanish ? 'Reporte descargado' : 'Report downloaded');
  }

  return (
    <ModernAppLayout>
      <div className="p-4 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold">
              {language === 'es' ? 'Gobernanza Laboral' : 'Labor Governance'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {language === 'es' 
                ? 'Tiempo, evidencia, validación y pagos' 
                : 'Time, evidence, validation and payments'}
            </p>
          </div>
          <Button onClick={exportToPDF} disabled={workerSummaries.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {language === 'es' ? 'Exportar PDF' : 'Export PDF'}
          </Button>
        </div>

        {/* Week Navigation */}
        <WeekNavigator 
          weekStart={weekStart} 
          onWeekChange={setWeekStart} 
          language={language} 
        />

        {/* Rate Configuration */}
        <RateConfigCard
          language={language}
          currency={currency}
          onCurrencyChange={setCurrency}
          rateType={rateType}
          onRateTypeChange={setRateType}
          rateAmount={rateAmount}
          onRateAmountChange={setRateAmount}
        />

        {/* Week Summary Stats */}
        <WeekSummaryCard
          language={language}
          currency={currency}
          hourlyRate={rateAmount}
          workerSummaries={workerSummaries}
        />

        {/* Workers List */}
        <div className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'es' ? 'Turnos por Trabajador' : 'Shifts by Worker'}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : workerSummaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">
                {language === 'es' ? 'No hay turnos esta semana' : 'No shifts this week'}
              </p>
              <p className="text-sm mt-1">
                {language === 'es' 
                  ? 'Los check-ins de trabajadores aparecerán aquí'
                  : 'Worker check-ins will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workerSummaries.map(worker => (
                <WorkerShiftCard
                  key={worker.userId}
                  worker={worker}
                  language={language}
                  currency={currency}
                  hourlyRate={rateAmount}
                  onValidateShift={setValidatingShift}
                  onPayShift={setPayingShift}
                />
              ))}
            </div>
          )}
        </div>

        {/* Validation Modal */}
        <ValidationModal
          open={!!validatingShift}
          onOpenChange={(open) => !open && setValidatingShift(null)}
          shift={validatingShift}
          language={language}
          onConfirm={handleValidation}
        />

        {/* Payment Modal */}
        <PaymentModal
          open={!!payingShift}
          onOpenChange={(open) => !open && setPayingShift(null)}
          shift={payingShift}
          language={language}
          defaultCurrency={currency}
          hourlyRate={rateAmount}
          onConfirm={handlePayment}
        />
      </div>
    </ModernAppLayout>
  );
}
