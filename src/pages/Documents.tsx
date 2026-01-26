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
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
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

  async function generatePropertyManual() {
    if (!currentEstate) return;
    
    setGeneratingManual(true);
    toast.info(language === 'es' ? 'Generando manual... esto puede tomar un minuto' : 'Generating manual... this may take a minute');

    try {
      // Fetch all estate data
      const [zonesRes, assetsRes, tasksRes, completionsRes, checkinsRes, docsRes, alertsRes] = await Promise.all([
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
        supabase.from('weather_alerts').select('*').eq('estate_id', currentEstate.id)
      ]);

      const dataPrompt = buildEstateDataPrompt({
        estateName: currentEstate.name,
        estateAddress: currentEstate.address_text,
        estateCountry: currentEstate.country,
        generationDate: format(new Date(), 'PPP', { locale: language === 'es' ? es : undefined }),
        zones: zonesRes.data || [],
        assets: assetsRes.data || [],
        tasks: tasksRes.data || [],
        completions: completionsRes.data || [],
        checkins: checkinsRes.data || [],
        documents: docsRes.data || [],
        weatherAlerts: alertsRes.data || [],
        language: language as 'en' | 'es',
      });

      const { data, error } = await supabase.functions.invoke('generate-estate-manual', {
        body: { 
          systemPrompt: ESTATE_MANUAL_SYSTEM_PROMPT,
          dataPrompt 
        }
      });

      if (error) throw error;

      if (data?.manual) {
        // Create a blob and download
        const blob = new Blob([data.manual], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentEstate.name.replace(/\s+/g, '-')}-Manual-${format(new Date(), 'yyyy-MM-dd')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(language === 'es' ? 'Manual generado exitosamente' : 'Manual generated successfully');
      }
    } catch (error) {
      console.error('Error generating manual:', error);
      toast.error(language === 'es' ? 'Error al generar el manual' : 'Error generating manual');
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
