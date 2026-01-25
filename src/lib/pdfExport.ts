 import jsPDF from 'jspdf';
 import { format } from 'date-fns';
 import { es } from 'date-fns/locale';
 
 interface Task {
   title: string;
   description?: string;
   due_date?: string;
  status?: string;
   asset?: { name: string };
   zone?: { name: string };
 }
 
 interface TaskCompletion {
   completed_at: string;
   notes?: string;
   photo_url?: string;
   completed_by?: { full_name: string };
   task: Task;
 }
 
 interface CheckIn {
   checkin_at: string;
   notes?: string;
   photo_url?: string;
   user: { full_name: string };
   asset?: { name: string };
   zone?: { name: string };
 }
 
 interface ReportData {
   estateName: string;
   startDate: Date;
   endDate: Date;
   completions: TaskCompletion[];
   checkins: CheckIn[];
   language: 'en' | 'es';
 }
 
 export async function generateDutyOfCareReport(data: ReportData): Promise<void> {
   const { estateName, startDate, endDate, completions, checkins, language } = data;
   const isSpanish = language === 'es';
   
   const doc = new jsPDF();
   const pageWidth = doc.internal.pageSize.getWidth();
   const pageHeight = doc.internal.pageSize.getHeight();
   const margin = 20;
   let yPos = margin;
 
   // Title
   doc.setFontSize(20);
   doc.setFont('helvetica', 'bold');
   doc.text(
     isSpanish ? 'Informe de Deber de Cuidado' : 'Duty of Care Report',
     pageWidth / 2,
     yPos,
     { align: 'center' }
   );
   yPos += 15;
 
   // Estate & Date Range
   doc.setFontSize(12);
   doc.setFont('helvetica', 'normal');
   doc.text(estateName, pageWidth / 2, yPos, { align: 'center' });
   yPos += 8;
   
   const dateLocale = isSpanish ? es : undefined;
   const dateFormat = isSpanish ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
   const dateRange = `${format(startDate, dateFormat, { locale: dateLocale })} - ${format(endDate, dateFormat, { locale: dateLocale })}`;
   doc.text(dateRange, pageWidth / 2, yPos, { align: 'center' });
   yPos += 15;
 
   // Summary Section
   doc.setFontSize(14);
   doc.setFont('helvetica', 'bold');
   doc.text(isSpanish ? 'Resumen' : 'Summary', margin, yPos);
   yPos += 8;
 
   doc.setFontSize(10);
   doc.setFont('helvetica', 'normal');
   doc.text(`${isSpanish ? 'Tareas Completadas:' : 'Tasks Completed:'} ${completions.length}`, margin, yPos);
   yPos += 6;
   doc.text(`${isSpanish ? 'Registros de Campo:' : 'Field Check-ins:'} ${checkins.length}`, margin, yPos);
   yPos += 12;
 
   // Task Completions Section
   if (completions.length > 0) {
     doc.setFontSize(14);
     doc.setFont('helvetica', 'bold');
     doc.text(isSpanish ? 'Tareas Completadas' : 'Completed Tasks', margin, yPos);
     yPos += 8;
 
     completions.forEach((completion, idx) => {
       // Check if we need a new page
       if (yPos > pageHeight - 40) {
         doc.addPage();
         yPos = margin;
       }
 
       doc.setFontSize(11);
       doc.setFont('helvetica', 'bold');
       doc.text(`${idx + 1}. ${completion.task.title}`, margin, yPos);
       yPos += 6;
 
       doc.setFontSize(9);
       doc.setFont('helvetica', 'normal');
       
       const completedDate = format(
         new Date(completion.completed_at),
         `${dateFormat} HH:mm`,
         { locale: dateLocale }
       );
       doc.text(`${isSpanish ? 'Completado:' : 'Completed:'} ${completedDate}`, margin + 5, yPos);
       yPos += 5;
 
       if (completion.completed_by) {
         doc.text(`${isSpanish ? 'Por:' : 'By:'} ${completion.completed_by.full_name}`, margin + 5, yPos);
         yPos += 5;
       }
 
       if (completion.task.asset) {
         doc.text(`${isSpanish ? 'Activo:' : 'Asset:'} ${completion.task.asset.name}`, margin + 5, yPos);
         yPos += 5;
       }
 
       if (completion.task.zone) {
         doc.text(`${isSpanish ? 'Zona:' : 'Zone:'} ${completion.task.zone.name}`, margin + 5, yPos);
         yPos += 5;
       }
 
       if (completion.notes) {
         const splitNotes = doc.splitTextToSize(
           `${isSpanish ? 'Notas:' : 'Notes:'} ${completion.notes}`,
           pageWidth - margin * 2 - 5
         );
         doc.text(splitNotes, margin + 5, yPos);
         yPos += splitNotes.length * 5;
       }
 
       if (completion.photo_url) {
         doc.setTextColor(0, 100, 200);
         doc.text(`[${isSpanish ? 'Foto adjunta' : 'Photo attached'}]`, margin + 5, yPos);
         doc.setTextColor(0, 0, 0);
         yPos += 5;
       }
 
       yPos += 5;
     });
   }
 
   // Check-ins Section
   if (checkins.length > 0) {
     if (yPos > pageHeight - 40) {
       doc.addPage();
       yPos = margin;
     }
 
     yPos += 10;
     doc.setFontSize(14);
     doc.setFont('helvetica', 'bold');
     doc.text(isSpanish ? 'Registros de Campo' : 'Field Check-ins', margin, yPos);
     yPos += 8;
 
     checkins.forEach((checkin, idx) => {
       if (yPos > pageHeight - 40) {
         doc.addPage();
         yPos = margin;
       }
 
       doc.setFontSize(11);
       doc.setFont('helvetica', 'bold');
       const checkinDate = format(
         new Date(checkin.checkin_at),
         `${dateFormat} HH:mm`,
         { locale: dateLocale }
       );
       doc.text(`${idx + 1}. ${checkinDate}`, margin, yPos);
       yPos += 6;
 
       doc.setFontSize(9);
       doc.setFont('helvetica', 'normal');
       doc.text(`${isSpanish ? 'Usuario:' : 'User:'} ${checkin.user.full_name}`, margin + 5, yPos);
       yPos += 5;
 
       if (checkin.asset) {
         doc.text(`${isSpanish ? 'Activo:' : 'Asset:'} ${checkin.asset.name}`, margin + 5, yPos);
         yPos += 5;
       }
 
       if (checkin.zone) {
         doc.text(`${isSpanish ? 'Zona:' : 'Zone:'} ${checkin.zone.name}`, margin + 5, yPos);
         yPos += 5;
       }
 
       if (checkin.notes) {
         const splitNotes = doc.splitTextToSize(
           `${isSpanish ? 'Notas:' : 'Notes:'} ${checkin.notes}`,
           pageWidth - margin * 2 - 5
         );
         doc.text(splitNotes, margin + 5, yPos);
         yPos += splitNotes.length * 5;
       }
 
       if (checkin.photo_url) {
         doc.setTextColor(0, 100, 200);
         doc.text(`[${isSpanish ? 'Foto adjunta' : 'Photo attached'}]`, margin + 5, yPos);
         doc.setTextColor(0, 0, 0);
         yPos += 5;
       }
 
       yPos += 5;
     });
   }
 
   // Footer
   const totalPages = doc.getNumberOfPages();
   for (let i = 1; i <= totalPages; i++) {
     doc.setPage(i);
     doc.setFontSize(8);
     doc.setTextColor(128);
     doc.text(
       `${isSpanish ? 'Generado:' : 'Generated:'} ${format(new Date(), `${dateFormat} HH:mm`, { locale: dateLocale })}`,
       margin,
       pageHeight - 10
     );
     doc.text(
       `${isSpanish ? 'Página' : 'Page'} ${i} ${isSpanish ? 'de' : 'of'} ${totalPages}`,
       pageWidth - margin,
       pageHeight - 10,
       { align: 'right' }
     );
   }
 
   // Save the PDF
   const filename = `duty-of-care-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
   doc.save(filename);
 }