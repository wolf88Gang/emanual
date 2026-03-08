import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  CloudSun, 
  QrCode,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  ChevronRight,
  Settings,
  Printer,
  UserPlus
} from 'lucide-react';
import { TeamManagement } from '@/components/team/TeamManagement';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { SimulateAlertButton } from '@/components/admin/SimulateAlertButton';
import { AddWeatherRuleDialog } from '@/components/admin/AddWeatherRuleDialog';
import { EmergencyAlertDialog } from '@/components/admin/EmergencyAlertDialog';
import { AssetQRCode } from '@/components/assets/AssetQRCode';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  roles: string[];
}

interface Vendor {
  id: string;
  name: string;
  service_type: string | null;
  phone: string | null;
  email: string | null;
}

interface WeatherRule {
  id: string;
  rule_type: string;
  threshold_json: any;
  action_text: string;
  action_text_es: string | null;
  enabled: boolean;
  auto_create_tasks: boolean;
}

interface QRLabel {
  id: string;
  code: string;
  label_text: string | null;
  asset: {
    id: string;
    name: string;
    asset_type: string;
  };
}

const roleColors: Record<string, string> = {
  owner: 'bg-primary/20 text-primary',
  manager: 'bg-info/20 text-info',
  crew: 'bg-success/20 text-success',
  vendor: 'bg-warning/20 text-warning',
};

const weatherRuleLabels: Record<string, { en: string; es: string; icon: string }> = {
  freeze: { en: 'Freeze Warning', es: 'Alerta de Helada', icon: '❄️' },
  heavy_rain: { en: 'Heavy Rain', es: 'Lluvia Fuerte', icon: '🌧️' },
  high_wind: { en: 'High Wind', es: 'Viento Fuerte', icon: '💨' },
  drought: { en: 'Drought Alert', es: 'Alerta de Sequía', icon: '☀️' },
};

export default function Admin() {
  const { t, language } = useLanguage();
  const { currentEstate } = useEstate();
  const { isOwnerOrManager, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [weatherRules, setWeatherRules] = useState<WeatherRule[]>([]);
  const [qrLabels, setQRLabels] = useState<QRLabel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentEstate && isOwnerOrManager) {
      fetchAdminData();
    }
  }, [currentEstate, isOwnerOrManager]);

  async function fetchAdminData() {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      const [vendorsRes, rulesRes, labelsRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('*')
          .eq('estate_id', currentEstate.id)
          .order('name'),
        supabase
          .from('weather_rules')
          .select('*')
          .eq('estate_id', currentEstate.id)
          .order('rule_type'),
        supabase
          .from('qr_labels')
          .select(`
            *,
            assets:asset_id (id, name, asset_type)
          `)
          .eq('estate_id', currentEstate.id)
          .order('code'),
      ]);

      setVendors(vendorsRes.data || []);
      setWeatherRules(rulesRes.data || []);
      setQRLabels((labelsRes.data || []).map(label => ({
        ...label,
        asset: label.assets as QRLabel['asset'],
      })));

      // Mock users for now (in real app, fetch from profiles with roles)
      setUsers([
        { id: '1', email: 'owner@demo.com', full_name: 'Estate Owner', avatar_url: null, roles: ['owner'] },
        { id: '2', email: 'manager@demo.com', full_name: 'Property Manager', avatar_url: null, roles: ['manager'] },
        { id: '3', email: 'crew@demo.com', full_name: 'Landscape Crew', avatar_url: null, roles: ['crew'] },
      ]);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleWeatherRule(ruleId: string, enabled: boolean) {
    try {
      await supabase
        .from('weather_rules')
        .update({ enabled })
        .eq('id', ruleId);

      setWeatherRules(prev => 
        prev.map(r => r.id === ruleId ? { ...r, enabled } : r)
      );
    } catch (error) {
      console.error('Error updating weather rule:', error);
    }
  }

  if (!isOwnerOrManager) {
    return (
      <ModernAppLayout>
        <div className="container py-12 text-center">
          <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-serif font-semibold mb-2">
            {language === 'es' ? 'Acceso Restringido' : 'Access Restricted'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'es' 
              ? 'El acceso de administrador solo está disponible para propietarios y gerentes.'
              : 'Admin access is only available to owners and managers.'}
          </p>
        </div>
      </ModernAppLayout>
    );
  }

  return (
    <ModernAppLayout>
      <div className="container py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold">{t('admin.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {language === 'es' ? 'Gestiona usuarios, proveedores y configuración' : 'Manage users, vendors, and estate settings'}
            </p>
          </div>
          <EmergencyAlertDialog onAlertSent={() => fetchAdminData()} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              {t('admin.users')}
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-2">
              <Building2 className="h-4 w-4" />
              {t('admin.vendors')}
            </TabsTrigger>
            <TabsTrigger value="weather" className="gap-2">
              <CloudSun className="h-4 w-4" />
              {t('admin.weatherRules')}
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-2">
              <QrCode className="h-4 w-4" />
              {t('admin.qrLabels')}
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <UserPlus className="h-4 w-4" />
              {language === 'es' ? 'Equipo' : 'Team'}
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">
                {language === 'es' ? 'Miembros del Equipo' : 'Team Members'}
              </h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Invitar Usuario' : 'Invite User'}
              </Button>
            </div>

            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="estate-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.full_name?.[0] || user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.full_name || 'User'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex gap-2">
                        {user.roles.map(role => (
                          <Badge 
                            key={role} 
                            variant="secondary"
                            className={roleColors[role]}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">
                {language === 'es' ? 'Proveedores y Contratistas' : 'Vendors & Contractors'}
              </h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Agregar Proveedor' : 'Add Vendor'}
              </Button>
            </div>

            {vendors.length === 0 ? (
              <Card className="estate-card">
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg">
                    {language === 'es' ? 'Sin proveedores' : 'No vendors yet'}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {language === 'es' 
                      ? 'Agrega proveedores y contratistas para asignarles tareas'
                      : 'Add vendors and contractors to assign tasks to them'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {vendors.map((vendor) => (
                  <Card key={vendor.id} className="estate-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{vendor.name}</h3>
                          {vendor.service_type && (
                            <Badge variant="secondary" className="mt-1">
                              {vendor.service_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {vendor.email && (
                          <p className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            {vendor.email}
                          </p>
                        )}
                        {vendor.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            {vendor.phone}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Weather Rules Tab */}
          <TabsContent value="weather" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">
                {language === 'es' ? 'Reglas de Alertas del Clima' : 'Weather Alert Rules'}
              </h2>
              <div className="flex gap-2">
              <SimulateAlertButton 
                weatherRules={weatherRules} 
                onAlertCreated={() => fetchAdminData()}
              />
              <AddWeatherRuleDialog onRuleAdded={() => fetchAdminData()} />
              </div>
            </div>

            {weatherRules.length === 0 ? (
              <Card className="estate-card">
                <CardContent className="py-12 text-center">
                  <CloudSun className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg">
                    {language === 'es' ? 'Sin reglas del clima' : 'No weather rules'}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {language === 'es'
                      ? 'Crea reglas para recibir alertas basadas en condiciones climáticas'
                      : 'Create rules to get alerts based on weather conditions'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {weatherRules.map((rule) => {
                  const ruleLabel = weatherRuleLabels[rule.rule_type];
                  
                  return (
                    <Card key={rule.id} className="estate-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{ruleLabel?.icon || '⚠️'}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium">
                              {language === 'es' ? ruleLabel?.es : ruleLabel?.en}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                              {language === 'es' && rule.action_text_es 
                                ? rule.action_text_es 
                                : rule.action_text}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {rule.auto_create_tasks && (
                              <Badge variant="secondary">Auto-tasks</Badge>
                            )}
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(checked) => toggleWeatherRule(rule.id, checked)}
                            />
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* QR Labels Tab */}
          <TabsContent value="qr" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">QR Code Labels</h2>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  {t('admin.printLabels')}
                </Button>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('admin.generateLabels')}
                </Button>
              </div>
            </div>

            {qrLabels.length === 0 ? (
              <Card className="estate-card">
                <CardContent className="py-12 text-center">
                  <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg">
                    {language === 'es' ? 'Generar Etiquetas QR' : 'Generate QR Labels'}
                  </h3>
                  <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                    {language === 'es'
                      ? 'Crea códigos QR escaneables para tus activos. Al escanearlos, abrirán la página de detalles del activo en la app.'
                      : "Create scannable QR codes for your assets. When scanned, they'll open the asset's detail page in the app."}
                  </p>
                  <Button className="mt-4">
                    {language === 'es' ? 'Generar para Todos los Activos' : 'Generate for All Assets'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {qrLabels.map((label) => (
                  <AssetQRCode
                    key={label.id}
                    assetId={label.asset.id}
                    assetName={label.asset.name}
                    qrCode={label.code}
                    size={120}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ModernAppLayout>
  );
}
