 import React, { useState } from 'react';
 import { MapPin, Plus, Loader2, Building, Mountain, Lock } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
 import { useLanguage } from '@/contexts/LanguageContext';
 import { useAuth } from '@/contexts/AuthContext';
 import { useEstate } from '@/contexts/EstateContext';
 import { useSubscription } from '@/contexts/SubscriptionContext';
 import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 export default function EstateManagement() {
   const { language } = useLanguage();
   const { profile } = useAuth();
   const { estates, refetch } = useEstate();
   const navigate = useNavigate();
   const [showCreate, setShowCreate] = useState(false);
   const [creating, setCreating] = useState(false);
   
   const [newEstate, setNewEstate] = useState({
     name: '',
     country: 'MX',
     timezone: 'America/Cancun',
     address_text: '',
     lat: null as number | null,
     lng: null as number | null
   });
 
   async function createEstate() {
     if (!newEstate.name.trim()) {
       toast.error(language === 'es' ? 'Ingrese el nombre de la finca' : 'Enter estate name');
       return;
     }
 
     if (!profile?.org_id) {
       toast.error(language === 'es' ? 'No hay organización' : 'No organization found');
       return;
     }
 
     setCreating(true);
     try {
       const { data, error } = await supabase
         .from('estates')
         .insert([{
           name: newEstate.name,
           org_id: profile.org_id,
           country: newEstate.country,
           timezone: newEstate.timezone,
           address_text: newEstate.address_text || null,
           lat: newEstate.lat,
           lng: newEstate.lng
         }])
         .select()
         .single();
 
       if (error) throw error;
 
       toast.success(language === 'es' ? '✅ Finca creada' : '✅ Estate created');
       setShowCreate(false);
       setNewEstate({
         name: '',
         country: 'MX',
         timezone: 'America/Cancun',
         address_text: '',
         lat: null,
         lng: null
       });
       
       await refetch();
       navigate(`/map?estate=${data.id}`);
     } catch (error: any) {
       console.error('Error creating estate:', error);
       toast.error(error.message || (language === 'es' ? 'Error al crear' : 'Failed to create'));
     } finally {
       setCreating(false);
     }
   }
 
   const timezones = [
     { value: 'America/Cancun', label: 'Cancún (UTC-5)' },
     { value: 'America/Mexico_City', label: 'Ciudad de México (UTC-6)' },
     { value: 'America/Puerto_Rico', label: 'Puerto Rico (UTC-4)' },
     { value: 'America/New_York', label: 'New York (UTC-5)' },
     { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
   ];
 
   return (
     <ModernAppLayout>
       <div className="p-4 space-y-6">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-serif font-bold">
               {language === 'es' ? 'Gestión de Fincas' : 'Estate Management'}
             </h1>
             <p className="text-muted-foreground text-sm">
               {language === 'es' 
                 ? 'Administra tus propiedades y ubicaciones' 
                 : 'Manage your properties and locations'}
             </p>
           </div>
           
           <Sheet open={showCreate} onOpenChange={setShowCreate}>
             <SheetTrigger asChild>
               <Button className="gap-2">
                 <Plus className="h-4 w-4" />
                 {language === 'es' ? 'Nueva Finca' : 'New Estate'}
               </Button>
             </SheetTrigger>
             <SheetContent className="w-full sm:max-w-lg overflow-auto">
               <SheetHeader>
                 <SheetTitle className="flex items-center gap-2">
                   <Building className="h-5 w-5 text-primary" />
                   {language === 'es' ? 'Crear Nueva Finca' : 'Create New Estate'}
                 </SheetTitle>
               </SheetHeader>
               
               <div className="mt-6 space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="name">{language === 'es' ? 'Nombre *' : 'Name *'}</Label>
                   <Input
                     id="name"
                     placeholder={language === 'es' ? 'Ej: Bahía Vista Estates' : 'E.g., Bahia Vista Estates'}
                     value={newEstate.name}
                     onChange={(e) => setNewEstate(p => ({ ...p, name: e.target.value }))}
                   />
                 </div>
                 
                 <div className="space-y-2">
                   <Label htmlFor="country">{language === 'es' ? 'País' : 'Country'}</Label>
                   <Select 
                     value={newEstate.country} 
                     onValueChange={(v) => setNewEstate(p => ({ ...p, country: v }))}
                   >
                     <SelectTrigger id="country">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="MX">México</SelectItem>
                       <SelectItem value="PR">Puerto Rico</SelectItem>
                       <SelectItem value="US">United States</SelectItem>
                       <SelectItem value="CR">Costa Rica</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 
                 <div className="space-y-2">
                   <Label htmlFor="timezone">{language === 'es' ? 'Zona Horaria' : 'Timezone'}</Label>
                   <Select 
                     value={newEstate.timezone} 
                     onValueChange={(v) => setNewEstate(p => ({ ...p, timezone: v }))}
                   >
                     <SelectTrigger id="timezone">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {timezones.map(tz => (
                         <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 
                 <div className="space-y-2">
                   <Label htmlFor="address">{language === 'es' ? 'Dirección' : 'Address'}</Label>
                   <Textarea
                     id="address"
                     placeholder={language === 'es' ? 'Dirección completa...' : 'Full address...'}
                     value={newEstate.address_text}
                     onChange={(e) => setNewEstate(p => ({ ...p, address_text: e.target.value }))}
                   />
                 </div>
                 
                 <div className="grid gap-4 sm:grid-cols-2">
                   <div className="space-y-2">
                     <Label htmlFor="lat">{language === 'es' ? 'Latitud' : 'Latitude'}</Label>
                     <Input
                       id="lat"
                       type="number"
                       step="any"
                       placeholder="20.2086"
                       value={newEstate.lat ?? ''}
                       onChange={(e) => setNewEstate(p => ({ ...p, lat: e.target.value ? parseFloat(e.target.value) : null }))}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="lng">{language === 'es' ? 'Longitud' : 'Longitude'}</Label>
                     <Input
                       id="lng"
                       type="number"
                       step="any"
                       placeholder="-87.4650"
                       value={newEstate.lng ?? ''}
                       onChange={(e) => setNewEstate(p => ({ ...p, lng: e.target.value ? parseFloat(e.target.value) : null }))}
                     />
                   </div>
                 </div>
                 
                 <Button 
                   className="w-full gap-2" 
                   onClick={createEstate}
                   disabled={creating || !newEstate.name.trim()}
                 >
                   {creating ? (
                     <>
                       <Loader2 className="h-4 w-4 animate-spin" />
                       {language === 'es' ? 'Creando...' : 'Creating...'}
                     </>
                   ) : (
                     <>
                       <Plus className="h-4 w-4" />
                       {language === 'es' ? 'Crear Finca' : 'Create Estate'}
                     </>
                   )}
                 </Button>
               </div>
             </SheetContent>
           </Sheet>
         </div>
 
        {/* Estate List */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {estates.map(estate => (
              <Card
                key={estate.id}
                className="hover:border-primary/50 transition-colors estate-card"
              >
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => navigate(`/map?estate=${estate.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{estate.name}</CardTitle>
                      {estate.country && (
                        <CardDescription className="text-xs">{estate.country}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 space-y-3">
                  {estate.address_text && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{estate.address_text}</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/topography');
                    }}
                  >
                    <Mountain className="h-4 w-4" />
                    {language === 'es' ? 'Topografía y Riesgos' : 'Topography & Risks'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
 
         {estates.length === 0 && (
           <Card className="border-dashed">
             <CardContent className="py-12 text-center">
               <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
               <p className="text-muted-foreground">
                 {language === 'es' ? 'Crea tu primera finca' : 'Create your first estate'}
               </p>
             </CardContent>
           </Card>
         )}
       </div>
     </ModernAppLayout>
   );
 }