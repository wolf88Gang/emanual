import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Upload,
  FileText,
  File,
  Calendar,
  AlertCircle,
  ExternalLink,
  Filter,
  ChevronRight,
  FolderOpen,
  BookOpen,
  Download,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ESTATE_MANUAL_SYSTEM_PROMPT, buildEstateDataPrompt } from '@/lib/estateManualPrompt';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  category: string;
  file_url: string;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  asset?: {
    id: string;
    name: string;
  };
  zone?: {
    id: string;
    name: string;
  };
  vendor?: {
    id: string;
    name: string;
  };
}

const categoryConfig: Record<string, { label: string; labelEs: string; icon: typeof FileText; color: string }> = {
  warranty: { label: 'Warranty', labelEs: 'Garantía', icon: FileText, color: 'text-success' },
  asbuilt: { label: 'As-Built', labelEs: 'As-Built', icon: File, color: 'text-info' },
  irrigation: { label: 'Irrigation', labelEs: 'Riego', icon: File, color: 'text-estate-water' },
  lighting: { label: 'Lighting', labelEs: 'Iluminación', icon: File, color: 'text-asset-lighting' },
  planting_plan: { label: 'Planting Plan', labelEs: 'Plan de Plantación', icon: File, color: 'text-asset-plant' },
  vendor_contract: { label: 'Vendor Contract', labelEs: 'Contrato', icon: FileText, color: 'text-primary' },
  insurance: { label: 'Insurance', labelEs: 'Seguro', icon: FileText, color: 'text-warning' },
  other: { label: 'Other', labelEs: 'Otro', icon: File, color: 'text-muted-foreground' },
};

export default function Documents() {
  const { t, language } = useLanguage();
  const { currentEstate } = useEstate();
  const { isOwnerOrManager } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [generatingManual, setGeneratingManual] = useState(false);

  useEffect(() => {
    if (currentEstate) {
      fetchDocuments();
    }
  }, [currentEstate]);

  async function fetchDocuments() {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          assets:asset_id (id, name),
          zones:zone_id (id, name),
          vendors:vendor_id (id, name)
        `)
        .eq('estate_id', currentEstate.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments((data || []).map(doc => ({
        ...doc,
        asset: doc.assets as Document['asset'],
        zone: doc.zones as Document['zone'],
        vendor: doc.vendors as Document['vendor'],
      })));
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    return isBefore(parseISO(date), addDays(new Date(), 30));
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return isBefore(parseISO(date), new Date());
  };

  const filteredDocuments = documents.filter(doc => {
    if (activeCategory !== 'all' && doc.category !== activeCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.notes?.toLowerCase().includes(query) ||
        doc.asset?.name.toLowerCase().includes(query) ||
        doc.vendor?.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const expiringCount = documents.filter(d => 
    d.expiry_date && isExpiringSoon(d.expiry_date) && !isExpired(d.expiry_date)
  ).length;

  const categoryCounts = documents.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Helper to load image as base64
  async function loadImageAsBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function generatePropertyManual() {
    if (!currentEstate) return;
    
    setGeneratingManual(true);
    toast.info('Generando manual PDF profesional... esto puede tomar un minuto');

    try {
      // Fetch all estate data including photos
      const [zonesRes, assetsRes, tasksRes, completionsRes, checkinsRes, docsRes, alertsRes, photosRes] = await Promise.all([
        supabase.from('zones').select('*').eq('estate_id', currentEstate.id),
        supabase.from('assets').select('*').eq('estate_id', currentEstate.id),
        supabase.from('tasks').select('*').eq('estate_id', currentEstate.id),
        supabase.from('task_completions').select(`
          *,
          task:tasks (*, asset:assets (name), zone:zones (name)),
          completed_by:profiles (full_name)
        `).order('completed_at', { ascending: false }),
        supabase.from('checkins').select(`
          *,
          user:profiles (full_name),
          asset:assets (name),
          zone:zones (name)
        `).eq('estate_id', currentEstate.id).order('checkin_at', { ascending: false }),
        supabase.from('documents').select('*').eq('estate_id', currentEstate.id),
        supabase.from('weather_alerts').select('*').eq('estate_id', currentEstate.id),
        supabase.from('asset_photos').select('*').order('created_at', { ascending: false }),
      ]);

      const zones = zonesRes.data || [];
      const assets = assetsRes.data || [];
      const tasks = tasksRes.data || [];
      const completions = completionsRes.data || [];
      const checkins = checkinsRes.data || [];
      const documents = docsRes.data || [];
      const weatherAlerts = alertsRes.data || [];
      const assetPhotos = photosRes.data || [];

      // Create photo map by asset_id
      const photosByAsset: Record<string, string> = {};
      for (const photo of assetPhotos) {
        if (!photosByAsset[photo.asset_id]) {
          photosByAsset[photo.asset_id] = photo.url;
        }
      }

      // Generate PDF directly with structured data (no AI call needed for better control)
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let yPos = margin;

      // Helper functions
      const checkPageBreak = (neededSpace: number) => {
        if (yPos + neededSpace > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      const addTitle = (text: string, size: number = 18) => {
        checkPageBreak(20);
        pdf.setFontSize(size);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(34, 139, 34);
        pdf.text(text, margin, yPos);
        yPos += size * 0.5 + 4;
        pdf.setTextColor(0, 0, 0);
      };

      const addSubtitle = (text: string, size: number = 14) => {
        checkPageBreak(15);
        pdf.setFontSize(size);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(60, 60, 60);
        pdf.text(text, margin, yPos);
        yPos += size * 0.4 + 3;
        pdf.setTextColor(0, 0, 0);
      };

      const addText = (text: string, fontSize: number = 10, indent: number = 0) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(text, contentWidth - indent);
        for (const line of lines) {
          checkPageBreak(fontSize * 0.5);
          pdf.text(line, margin + indent, yPos);
          yPos += fontSize * 0.5;
        }
      };

      const addLabelValue = (label: string, value: string, indent: number = 0) => {
        checkPageBreak(8);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${label}: `, margin + indent, yPos);
        const labelWidth = pdf.getTextWidth(`${label}: `);
        pdf.setFont('helvetica', 'normal');
        const valueLines = pdf.splitTextToSize(value || 'No registrado', contentWidth - indent - labelWidth);
        pdf.text(valueLines[0], margin + indent + labelWidth, yPos);
        yPos += 5;
        for (let i = 1; i < valueLines.length; i++) {
          pdf.text(valueLines[i], margin + indent, yPos);
          yPos += 5;
        }
      };

      const addSeparator = () => {
        yPos += 3;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
      };

      const addImage = async (url: string, maxWidth: number = 60, maxHeight: number = 45) => {
        try {
          const base64 = await loadImageAsBase64(url);
          if (base64) {
            checkPageBreak(maxHeight + 10);
            pdf.addImage(base64, 'JPEG', margin, yPos, maxWidth, maxHeight);
            yPos += maxHeight + 5;
            return true;
          }
        } catch (e) {
          console.log('Error loading image:', e);
        }
        return false;
      };

      // ==================== PORTADA ====================
      pdf.setFillColor(34, 139, 34);
      pdf.rect(0, 0, pageWidth, 50, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MANUAL DE LA PROPIEDAD', pageWidth / 2, 30, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text('Documento Técnico Integral', pageWidth / 2, 42, { align: 'center' });
      
      pdf.setTextColor(0, 0, 0);
      yPos = 70;
      
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(currentEstate.name, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      if (currentEstate.address_text) {
        pdf.text(currentEstate.address_text, pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
      }
      if (currentEstate.country) {
        pdf.text(currentEstate.country, pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
      }
      
      yPos += 15;
      pdf.setFontSize(11);
      pdf.text(`Fecha de Generación: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, pageWidth / 2, yPos, { align: 'center' });
      
      // Stats boxes
      yPos += 25;
      const statsData = [
        { label: 'Zonas', value: zones.length, color: [76, 175, 80] },
        { label: 'Activos', value: assets.length, color: [33, 150, 243] },
        { label: 'Tareas', value: tasks.length, color: [255, 152, 0] },
        { label: 'Documentos', value: documents.length, color: [156, 39, 176] },
      ];
      
      const boxWidth = 38;
      const boxGap = 8;
      const totalBoxesWidth = boxWidth * 4 + boxGap * 3;
      let boxX = (pageWidth - totalBoxesWidth) / 2;
      
      statsData.forEach((stat) => {
        pdf.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        pdf.roundedRect(boxX, yPos, boxWidth, 30, 3, 3, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text(String(stat.value), boxX + boxWidth / 2, yPos + 15, { align: 'center' });
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(stat.label, boxX + boxWidth / 2, yPos + 24, { align: 'center' });
        boxX += boxWidth + boxGap;
      });
      
      pdf.setTextColor(0, 0, 0);
      
      // Disclaimer
      yPos = pageHeight - 40;
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      const disclaimer = 'Este documento ha sido generado automáticamente a partir de los registros verificados del sistema. Toda la información presentada corresponde a datos reales capturados durante la operación de la propiedad.';
      const disclaimerLines = pdf.splitTextToSize(disclaimer, contentWidth);
      disclaimerLines.forEach((line: string) => {
        pdf.text(line, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      });

      // ==================== ÍNDICE ====================
      pdf.addPage();
      yPos = margin;
      addTitle('ÍNDICE DE CONTENIDOS', 20);
      yPos += 5;

      const tocItems = [
        '1. Resumen Ejecutivo',
        '2. Descripción de Zonas',
        '3. Inventario de Activos',
        '4. Historial de Mantenimiento',
        '5. Registros de Campo',
        '6. Documentación Asociada',
        '7. Alertas Climáticas',
      ];

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      tocItems.forEach((item) => {
        pdf.text(item, margin + 10, yPos);
        yPos += 10;
      });

      // ==================== 1. RESUMEN EJECUTIVO ====================
      pdf.addPage();
      yPos = margin;
      addTitle('1. RESUMEN EJECUTIVO', 18);
      yPos += 5;

      addText('Este manual documenta de manera integral la propiedad, sus zonas operativas, activos registrados y el historial completo de intervenciones. El objetivo es garantizar la continuidad operativa y facilitar la transferencia de conocimiento.', 11);
      yPos += 10;

      addSubtitle('Estadísticas Generales');
      addLabelValue('Total de Zonas', String(zones.length));
      addLabelValue('Total de Activos', String(assets.length));
      addLabelValue('Tareas Registradas', String(tasks.length));
      addLabelValue('Intervenciones Completadas', String(completions.length));
      addLabelValue('Registros de Campo', String(checkins.length));
      addLabelValue('Documentos Archivados', String(documents.length));

      // ==================== 2. ZONAS ====================
      pdf.addPage();
      yPos = margin;
      addTitle('2. DESCRIPCIÓN DE ZONAS', 18);
      yPos += 5;

      if (zones.length === 0) {
        addText('No existen zonas registradas en el sistema.', 11);
      } else {
        for (const zone of zones) {
          checkPageBreak(40);
          addSubtitle(`Zona: ${zone.name}`);
          addLabelValue('Propósito', zone.purpose_tags?.join(', ') || 'No definido', 5);
          addLabelValue('Notas', zone.notes || 'Sin notas', 5);
          const zoneAssets = assets.filter(a => a.zone_id === zone.id);
          addLabelValue('Activos en esta zona', String(zoneAssets.length), 5);
          yPos += 5;
          addSeparator();
        }
      }

      // ==================== 3. INVENTARIO DE ACTIVOS ====================
      pdf.addPage();
      yPos = margin;
      addTitle('3. INVENTARIO DE ACTIVOS', 18);
      yPos += 5;

      if (assets.length === 0) {
        addText('No existen activos registrados en el sistema.', 11);
      } else {
        for (const asset of assets) {
          checkPageBreak(80);
          
          // Asset header with green background
          pdf.setFillColor(240, 248, 240);
          pdf.roundedRect(margin - 5, yPos - 3, contentWidth + 10, 12, 2, 2, 'F');
          pdf.setFontSize(13);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(34, 100, 34);
          pdf.text(`${asset.name}`, margin, yPos + 5);
          pdf.setTextColor(0, 0, 0);
          yPos += 15;

          // Try to add asset photo
          const photoUrl = photosByAsset[asset.id];
          if (photoUrl) {
            await addImage(photoUrl, 55, 40);
          }

          const assetZone = zones.find(z => z.id === asset.zone_id);
          
          addLabelValue('Tipo', asset.asset_type, 5);
          addLabelValue('Zona', assetZone?.name || 'Sin asignar', 5);
          if (asset.lat && asset.lng) {
            addLabelValue('Coordenadas', `${asset.lat.toFixed(6)}, ${asset.lng.toFixed(6)}`, 5);
          }
          addLabelValue('Fecha de Instalación', asset.install_date || 'No registrada', 5);
          addLabelValue('Último Servicio', asset.last_service_date || 'No registrado', 5);
          
          if (asset.critical_care_note) {
            yPos += 3;
            const labelCritical = 'CUIDADO CRÍTICO: ';
            pdf.setFontSize(9);
            const criticalLines = pdf.splitTextToSize(asset.critical_care_note, contentWidth - 50);
            const criticalBoxHeight = Math.max(14, criticalLines.length * 5 + 8);
            checkPageBreak(criticalBoxHeight + 5);
            pdf.setFillColor(255, 243, 224);
            pdf.roundedRect(margin, yPos - 2, contentWidth, criticalBoxHeight, 2, 2, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(200, 100, 0);
            pdf.text(labelCritical, margin + 3, yPos + 5);
            const labelCriticalWidth = pdf.getTextWidth(labelCritical);
            pdf.setFont('helvetica', 'normal');
            let criticalY = yPos + 5;
            for (let i = 0; i < criticalLines.length; i++) {
              if (i === 0) {
                pdf.text(criticalLines[i], margin + 3 + labelCriticalWidth, criticalY);
              } else {
                criticalY += 5;
                pdf.text(criticalLines[i], margin + 3, criticalY);
              }
            }
            pdf.setTextColor(0, 0, 0);
            yPos += criticalBoxHeight + 3;
          }
          
          if (asset.do_not_do_warnings) {
            const labelNoHacer = 'NO HACER: ';
            pdf.setFontSize(9);
            const noHacerLines = pdf.splitTextToSize(asset.do_not_do_warnings, contentWidth - 40);
            const noHacerBoxHeight = Math.max(14, noHacerLines.length * 5 + 8);
            checkPageBreak(noHacerBoxHeight + 5);
            pdf.setFillColor(255, 235, 238);
            pdf.roundedRect(margin, yPos - 2, contentWidth, noHacerBoxHeight, 2, 2, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(200, 50, 50);
            pdf.text(labelNoHacer, margin + 3, yPos + 5);
            const labelNoHacerWidth = pdf.getTextWidth(labelNoHacer);
            pdf.setFont('helvetica', 'normal');
            let noHacerY = yPos + 5;
            for (let i = 0; i < noHacerLines.length; i++) {
              if (i === 0) {
                pdf.text(noHacerLines[i], margin + 3 + labelNoHacerWidth, noHacerY);
              } else {
                noHacerY += 5;
                pdf.text(noHacerLines[i], margin + 3, noHacerY);
              }
            }
            pdf.setTextColor(0, 0, 0);
            yPos += noHacerBoxHeight + 3;
          }

          if (asset.description) {
            addLabelValue('Descripción', asset.description, 5);
          }

          yPos += 5;
          addSeparator();
        }
      }

      // ==================== 4. HISTORIAL DE MANTENIMIENTO ====================
      pdf.addPage();
      yPos = margin;
      addTitle('4. HISTORIAL DE MANTENIMIENTO', 18);
      yPos += 5;

      if (completions.length === 0) {
        addText('No existen intervenciones registradas en el sistema.', 11);
      } else {
        addText(`Se han registrado ${completions.length} intervenciones de mantenimiento.`, 11);
        yPos += 8;

        const recentCompletions = completions.slice(0, 30);
        for (const completion of recentCompletions) {
          checkPageBreak(25);
          
          const taskTitle = (completion.task as any)?.title || 'Tarea';
          const assetName = (completion.task as any)?.asset?.name || '';
          const completedBy = (completion.completed_by as any)?.full_name || 'Usuario';
          const completedDate = format(new Date(completion.completed_at), "d MMM yyyy, HH:mm", { locale: es });

          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`• ${taskTitle}`, margin, yPos);
          yPos += 6;
          
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100);
          pdf.text(`Completado: ${completedDate} | Por: ${completedBy}${assetName ? ` | Activo: ${assetName}` : ''}`, margin + 5, yPos);
          pdf.setTextColor(0, 0, 0);
          yPos += 5;

          if (completion.notes) {
            pdf.setFontSize(9);
            pdf.text(`Notas: ${completion.notes}`, margin + 5, yPos);
            yPos += 5;
          }
          yPos += 3;
        }

        if (completions.length > 30) {
          yPos += 5;
          pdf.setFontSize(9);
          pdf.setTextColor(100);
          pdf.text(`(Se muestran las primeras 30 de ${completions.length} intervenciones)`, margin, yPos);
          pdf.setTextColor(0, 0, 0);
        }
      }

      // ==================== 5. REGISTROS DE CAMPO ====================
      pdf.addPage();
      yPos = margin;
      addTitle('5. REGISTROS DE CAMPO', 18);
      yPos += 5;

      if (checkins.length === 0) {
        addText('No existen registros de campo en el sistema.', 11);
      } else {
        addText(`Se han registrado ${checkins.length} visitas de campo.`, 11);
        yPos += 8;

        const recentCheckins = checkins.slice(0, 20);
        for (const checkin of recentCheckins) {
          checkPageBreak(20);
          
          const userName = (checkin.user as any)?.full_name || 'Usuario';
          const checkinDate = format(new Date(checkin.checkin_at), "d MMM yyyy, HH:mm", { locale: es });
          const location = (checkin.asset as any)?.name || (checkin.zone as any)?.name || 'General';

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${checkinDate}`, margin, yPos);
          pdf.setFont('helvetica', 'normal');
          pdf.text(` - ${userName} en ${location}`, margin + 40, yPos);
          yPos += 5;

          if (checkin.notes) {
            pdf.setFontSize(9);
            pdf.setTextColor(80);
            pdf.text(`"${checkin.notes}"`, margin + 5, yPos);
            pdf.setTextColor(0, 0, 0);
            yPos += 5;
          }
          yPos += 3;
        }
      }

      // ==================== 6. DOCUMENTACIÓN ====================
      pdf.addPage();
      yPos = margin;
      addTitle('6. DOCUMENTACIÓN ASOCIADA', 18);
      yPos += 5;

      if (documents.length === 0) {
        addText('No existen documentos registrados en el sistema.', 11);
      } else {
        for (const doc of documents) {
          checkPageBreak(25);
          
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`• ${doc.title}`, margin, yPos);
          yPos += 6;
          
          addLabelValue('Categoría', doc.category, 5);
          if (doc.expiry_date) {
            addLabelValue('Fecha de Vencimiento', format(new Date(doc.expiry_date), "d MMM yyyy", { locale: es }), 5);
          }
          if (doc.notes) {
            addLabelValue('Notas', doc.notes, 5);
          }
          yPos += 3;
        }
      }

      // ==================== 7. ALERTAS CLIMÁTICAS ====================
      pdf.addPage();
      yPos = margin;
      addTitle('7. ALERTAS CLIMÁTICAS', 18);
      yPos += 5;

      if (weatherAlerts.length === 0) {
        addText('No existen alertas climáticas registradas en el sistema.', 11);
      } else {
        for (const alert of weatherAlerts.slice(0, 20)) {
          checkPageBreak(20);
          
          const alertDate = format(new Date(alert.fired_at), "d MMM yyyy, HH:mm", { locale: es });
          const severity = alert.severity?.toUpperCase() || 'INFO';
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`[${severity}] ${alertDate}`, margin, yPos);
          yPos += 5;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          const msgLines = pdf.splitTextToSize(alert.message_es || alert.message, contentWidth - 10);
          msgLines.forEach((line: string) => {
            pdf.text(line, margin + 5, yPos);
            yPos += 4;
          });
          yPos += 3;
        }
      }

      // ==================== FOOTER ON ALL PAGES ====================
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text(
          `${currentEstate.name} - Manual de la Propiedad`,
          margin,
          pageHeight - 10
        );
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        );
      }

      // Save PDF
      const filename = `${currentEstate.name.replace(/\s+/g, '-')}-Manual-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(filename);

      toast.success('Manual PDF generado exitosamente');
    } catch (error) {
      console.error('Error generating manual:', error);
      toast.error('Error al generar el manual');
    } finally {
      setGeneratingManual(false);
    }
  }

  return (
    <ModernAppLayout>
      <div className="container py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold">{t('documents.digitalBinder')}</h1>
            <p className="text-muted-foreground mt-1">
              {documents.length} {language === 'es' ? 'documentos' : 'documents'}
              {expiringCount > 0 && (
                <span className="text-warning ml-2">
                  · {expiringCount} {language === 'es' ? 'por vencer' : 'expiring soon'}
                </span>
              )}
            </p>
          </div>
          {isOwnerOrManager && (
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              {t('documents.upload')}
            </Button>
          )}
        </div>

        {/* Property Manual Card - Prominent */}
        {isOwnerOrManager && (
          <Card className="estate-card mb-6 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-serif font-semibold">
                    {language === 'es' ? 'Manual de la Propiedad' : 'Property Manual'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'es' 
                      ? 'Genera un manual profesional completo con toda la información de zonas, activos, historial de mantenimiento y documentación técnica.'
                      : 'Generate a complete professional manual with all zone information, assets, maintenance history, and technical documentation.'}
                  </p>
                </div>
                <Button 
                  size="lg" 
                  onClick={generatePropertyManual}
                  disabled={generatingManual}
                  className="shrink-0"
                >
                  {generatingManual ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {language === 'es' ? 'Generando...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {language === 'es' ? 'Generar Manual' : 'Generate Manual'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${t('common.search')} documents, assets, vendors...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-6">
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex h-auto p-1 w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="all" className="gap-2">
                {language === 'es' ? 'Todo' : 'All'}
                <Badge variant="secondary" className="h-5 px-1.5">{documents.length}</Badge>
              </TabsTrigger>
              {Object.entries(categoryConfig).map(([key, config]) => {
                const count = categoryCounts[key] || 0;
                if (count === 0) return null;
                return (
                  <TabsTrigger key={key} value={key} className="gap-2">
                    {language === 'es' ? config.labelEs : config.label}
                    <Badge variant="secondary" className="h-5 px-1.5">{count}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Documents List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 rounded-xl shimmer" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card className="estate-card">
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">
                  {language === 'es' ? 'Sin documentos' : 'No documents found'}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {searchQuery || activeCategory !== 'all'
                    ? (language === 'es' ? 'Intenta ajustar tu búsqueda o filtros' : 'Try adjusting your search or filters')
                    : (language === 'es' ? 'Comienza subiendo tu primer documento' : 'Start by uploading your first document')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const config = categoryConfig[doc.category] || categoryConfig.other;
                const Icon = config.icon;
                const expired = isExpired(doc.expiry_date);
                const expiring = !expired && isExpiringSoon(doc.expiry_date);

                return (
                  <Card key={doc.id} className="estate-card cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                          'bg-secondary'
                        )}>
                          <Icon className={cn('h-6 w-6', config.color)} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{doc.title}</h3>
                            {expired && (
                              <Badge variant="destructive" className="shrink-0">
                                {language === 'es' ? 'Vencido' : 'Expired'}
                              </Badge>
                            )}
                            {expiring && (
                              <Badge variant="outline" className="border-warning text-warning shrink-0">
                                {language === 'es' ? 'Por Vencer' : 'Expiring Soon'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span className={config.color}>
                              {language === 'es' ? config.labelEs : config.label}
                            </span>
                            {doc.asset && (
                              <>
                                <span>•</span>
                                <span>{doc.asset.name}</span>
                              </>
                            )}
                            {doc.vendor && (
                              <>
                                <span>•</span>
                                <span>{doc.vendor.name}</span>
                              </>
                            )}
                          </div>
                          {doc.expiry_date && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {language === 'es' ? 'Vence:' : 'Expires:'} {format(parseISO(doc.expiry_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <Button variant="ghost" size="icon" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </Tabs>
      </div>
    </ModernAppLayout>
  );
}
