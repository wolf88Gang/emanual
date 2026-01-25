import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  Camera,
  QrCode,
  ClipboardList,
  FileText,
  Clock,
  CheckCircle2,
  Shield,
  Leaf,
  Wrench,
  XCircle,
  Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AssetTypeIcon, getAssetBadgeClass, AssetType } from '@/components/icons/AssetTypeIcon';
import { AssetQRCode } from '@/components/assets/AssetQRCode';
import { AssetEditForm } from '@/components/assets/AssetEditForm';
import { PlantProfileLinker } from '@/components/assets/PlantProfileLinker';
 import { AssetActionsCard } from '@/components/assets/AssetActionsCard';
 import { AssetPhotoUpload } from '@/components/assets/AssetPhotoUpload';

interface AssetDetail {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  zone_id: string | null;
  zone?: {
    id: string;
    name: string;
    color: string;
  };
  purpose_tags: string[];
  risk_flags: string[];
  critical_care_note: string | null;
  do_not_do_warnings: string | null;
  last_service_date: string | null;
  install_date: string | null;
  lat: number | null;
  lng: number | null;
  photos?: { id: string; url: string; caption: string | null }[];
  qr_code?: string;
}

interface TaskCompletion {
  id: string;
  task_title: string;
  completed_at: string;
  photo_url: string | null;
  notes: string | null;
  completed_by: string;
}

interface Checkin {
  id: string;
  checkin_at: string;
  photo_url: string | null;
  notes: string | null;
  user_name: string;
}

interface RelatedDocument {
  id: string;
  title: string;
  category: string;
  expiry_date: string | null;
  file_url: string;
}

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { currentEstate } = useEstate();
  
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [zones, setZones] = useState<Array<{ id: string; name: string; color: string | null }>>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [documents, setDocuments] = useState<RelatedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id && currentEstate) {
      fetchAssetData();
    }
  }, [id, currentEstate]);

  async function fetchAssetData() {
    if (!id || !currentEstate) return;
    
    setLoading(true);
    try {
      // Fetch asset with zone and photos
      const [assetRes, zonesRes] = await Promise.all([
        supabase
          .from('assets')
          .select(`
            *,
            zones:zone_id (id, name, color),
            asset_photos (id, url, caption)
          `)
          .eq('id', id)
          .eq('estate_id', currentEstate.id)
          .single(),
        supabase
          .from('zones')
          .select('id, name, color')
          .eq('estate_id', currentEstate.id)
          .order('name')
      ]);

      if (assetRes.error) throw assetRes.error;

      // Fetch QR label
      const { data: qrData } = await supabase
        .from('qr_labels')
        .select('code')
        .eq('asset_id', id)
        .single();

      setZones(zonesRes.data || []);
      setAsset({
        ...assetRes.data,
        zone: assetRes.data.zones as AssetDetail['zone'],
        photos: assetRes.data.asset_photos as AssetDetail['photos'],
        qr_code: qrData?.code,
      });

      // Fetch related task completions (evidence trail)
      const { data: completionsData } = await supabase
        .from('task_completions')
        .select(`
          id, completed_at, photo_url, notes,
          tasks:task_id (title),
          profiles:completed_by_user_id (full_name)
        `)
        .eq('tasks.asset_id', id)
        .order('completed_at', { ascending: false })
        .limit(10);

      setCompletions((completionsData || []).map(c => ({
        id: c.id,
        task_title: (c.tasks as any)?.title || 'Task',
        completed_at: c.completed_at,
        photo_url: c.photo_url,
        notes: c.notes,
        completed_by: (c.profiles as any)?.full_name || 'User',
      })));

      // Fetch related checkins (nearby evidence)
      const { data: checkinsData } = await supabase
        .from('checkins')
        .select(`
          id, checkin_at, photo_url, notes,
          profiles:user_id (full_name)
        `)
        .eq('asset_id', id)
        .order('checkin_at', { ascending: false })
        .limit(10);

      setCheckins((checkinsData || []).map(c => ({
        id: c.id,
        checkin_at: c.checkin_at,
        photo_url: c.photo_url,
        notes: c.notes,
        user_name: (c.profiles as any)?.full_name || 'User',
      })));

      // Fetch related documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('id, title, category, expiry_date, file_url')
        .eq('asset_id', id)
        .order('created_at', { ascending: false });

      setDocuments(docsData || []);

    } catch (error) {
      console.error('Error fetching asset data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ModernAppLayout>
        <div className="container py-6">
          <div className="h-96 rounded-xl shimmer" />
        </div>
      </ModernAppLayout>
    );
  }

  if (!asset) {
    return (
      <ModernAppLayout>
        <div className="container py-6 text-center">
          <XCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-serif">
            {language === 'es' ? 'Activo No Encontrado' : 'Asset Not Found'}
          </h2>
          <Button onClick={() => navigate('/assets')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'es' ? 'Volver a Activos' : 'Back to Assets'}
          </Button>
        </div>
      </ModernAppLayout>
    );
  }

  const hasRisks = asset.risk_flags && asset.risk_flags.length > 0;
  const assetType = asset.asset_type as AssetType;
  const assetBadgeClass = getAssetBadgeClass(assetType);

  return (
    <ModernAppLayout>
      <div className="container py-6 max-w-4xl">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/assets')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          {/* Photo */}
          <div className="w-full md:w-64 h-48 md:h-48 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
            {asset.photos && asset.photos[0] ? (
              <img 
                src={asset.photos[0].url} 
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <AssetTypeIcon type={assetType} size="lg" className="h-16 w-16 opacity-30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-serif font-semibold">{asset.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={assetBadgeClass}>
                    <AssetTypeIcon type={assetType} size="sm" className="h-3 w-3" />
                    <span className="ml-1 capitalize">{assetType.replace('_', ' ')}</span>
                  </Badge>
                  {asset.zone && (
                    <Badge variant="outline" className="gap-1">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: asset.zone.color }}
                      />
                      {asset.zone.name}
                    </Badge>
                  )}
                  {hasRisks && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {asset.risk_flags.length} {language === 'es' ? 'riesgos' : 'risks'}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowQR(!showQR)}>
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {asset.description && (
              <p className="text-muted-foreground mt-3">{asset.description}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              {asset.install_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {language === 'es' ? 'Instalado' : 'Installed'}: {format(new Date(asset.install_date), 'MMM d, yyyy')}
                </span>
              )}
              {asset.last_service_date && (
                <span className="flex items-center gap-1">
                  <Wrench className="h-4 w-4" />
                  {language === 'es' ? 'Último servicio' : 'Last service'}: {format(new Date(asset.last_service_date), 'MMM d, yyyy')}
                </span>
              )}
              {asset.lat && asset.lng && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {asset.lat.toFixed(4)}, {asset.lng.toFixed(4)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* QR Code Panel */}
        {showQR && asset.qr_code && (
          <Card className="estate-card mb-6">
            <CardContent className="py-6">
              <AssetQRCode 
                assetId={asset.id}
                assetName={asset.name}
                qrCode={asset.qr_code}
              />
            </CardContent>
          </Card>
        )}

        {/* Edit Form */}
        {isEditing && (
          <div className="mb-6">
            <AssetEditForm
              asset={{
                id: asset.id,
                name: asset.name,
                description: asset.description,
                asset_type: asset.asset_type,
                purpose_tags: asset.purpose_tags,
                risk_flags: asset.risk_flags,
                critical_care_note: asset.critical_care_note,
                do_not_do_warnings: asset.do_not_do_warnings,
                lat: asset.lat,
                lng: asset.lng,
                zone_id: asset.zone_id
              }}
              zones={zones}
              onSave={() => {
                setIsEditing(false);
                fetchAssetData();
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        )}

        {/* Asset Actions Card - Create tasks and update status */}
        {!isEditing && (
          <div className="mb-6">
            <AssetActionsCard
              assetId={asset.id}
              assetName={asset.name}
              currentRiskFlags={asset.risk_flags || []}
              onUpdate={fetchAssetData}
            />
          </div>
        )}

         {/* Photo Upload Section */}
         {!isEditing && (
           <div className="mb-6">
             <AssetPhotoUpload
               assetId={asset.id}
               assetName={asset.name}
               currentPhotos={asset.photos}
               onPhotoUploaded={fetchAssetData}
             />
           </div>
         )}

        {/* Plant Profile Linker - Only for plant/tree assets */}
        {!isEditing && (asset.asset_type === 'plant' || asset.asset_type === 'tree') && (
          <div className="mb-6">
            <PlantProfileLinker 
              assetId={asset.id} 
              assetType={asset.asset_type}
              onUpdate={fetchAssetData}
            />
          </div>
        )}

        {/* Intent & Care Section - DELMM Core */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Purpose & Intent */}
          <Card className="estate-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Leaf className="h-4 w-4 text-primary" />
                {t('assets.purpose')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {asset.purpose_tags && asset.purpose_tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {asset.purpose_tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No purpose tags defined</p>
              )}
            </CardContent>
          </Card>

          {/* Risk Flags */}
          <Card className={cn('estate-card', hasRisks && 'border-destructive/30')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <AlertTriangle className={cn('h-4 w-4', hasRisks ? 'text-destructive' : 'text-muted-foreground')} />
                {t('assets.riskFlags')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasRisks ? (
                <div className="flex flex-wrap gap-2">
                  {asset.risk_flags.map(flag => (
                    <Badge key={flag} variant="destructive" className="bg-destructive/10 text-destructive">
                      {flag.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No active risk flags</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Critical Care & Do Not Do */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card className="estate-card border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                {t('assets.criticalCare')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {asset.critical_care_note ? (
                <p className="text-sm">{asset.critical_care_note}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No critical care notes</p>
              )}
            </CardContent>
          </Card>

          <Card className="estate-card border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                {t('assets.doNotDo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {asset.do_not_do_warnings ? (
                <p className="text-sm text-destructive">{asset.do_not_do_warnings}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No warnings defined</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evidence Tabs - Duty of Care Trail */}
        <Tabs defaultValue="completions" className="mb-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="completions" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {language === 'es' ? 'Evidencia de Tareas' : 'Task Evidence'}
              <Badge variant="secondary" className="h-5">{completions.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="checkins" className="gap-2">
              <Camera className="h-4 w-4" />
              {language === 'es' ? 'Check-ins' : 'Check-ins'}
              <Badge variant="secondary" className="h-5">{checkins.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              {language === 'es' ? 'Documentos' : 'Documents'}
              <Badge variant="secondary" className="h-5">{documents.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="completions" className="mt-4">
            {completions.length === 0 ? (
              <Card className="estate-card">
                <CardContent className="py-8 text-center">
                  <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No task completions recorded</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {language === 'es' 
                      ? 'Completa tareas para construir evidencia' 
                      : 'Complete tasks to build evidence trail'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {completions.map(c => (
                  <Card key={c.id} className="estate-card">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {c.photo_url && (
                          <img 
                            src={c.photo_url} 
                            alt="Evidence" 
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{c.task_title}</p>
                          <p className="text-sm text-muted-foreground">{c.notes || 'No notes'}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(c.completed_at), 'MMM d, yyyy h:mm a')}
                            </span>
                            <span>{c.completed_by}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="checkins" className="mt-4">
            {checkins.length === 0 ? (
              <Card className="estate-card">
                <CardContent className="py-8 text-center">
                  <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No check-ins recorded</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {checkins.map(c => (
                  <Card key={c.id} className="estate-card">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {c.photo_url && (
                          <img 
                            src={c.photo_url} 
                            alt="Check-in" 
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{c.notes || 'No notes'}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(c.checkin_at), 'MMM d, yyyy h:mm a')}
                            </span>
                            <span>{c.user_name}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {documents.length === 0 ? (
              <Card className="estate-card">
                <CardContent className="py-8 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No linked documents</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <Card key={doc.id} className="estate-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {doc.category.replace('_', ' ')}
                            {doc.expiry_date && ` • Expires ${format(new Date(doc.expiry_date), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ModernAppLayout>
  );
}