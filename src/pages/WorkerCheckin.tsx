import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Clock, CheckCircle2, LogIn, LogOut, Loader2, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface WorkerShift {
  id: string;
  check_in_at: string;
  check_in_photo_url: string | null;
  check_out_at: string | null;
  check_out_photo_url: string | null;
}

export default function WorkerCheckin() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const { user } = useAuth();
  const { latitude, longitude, loading: geoLoading, error: geoError, getCurrentPosition, hasLocation } = useGeolocation();
  
  const [activeShift, setActiveShift] = useState<WorkerShift | null>(null);
  const [recentShifts, setRecentShifts] = useState<WorkerShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (currentEstate && user) {
      fetchShifts();
    }
  }, [currentEstate, user]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function fetchShifts() {
    if (!currentEstate || !user) return;
    
    try {
      // Get active shift (no check_out_at)
      const { data: active } = await supabase
        .from('worker_shifts')
        .select('*')
        .eq('estate_id', currentEstate.id)
        .eq('user_id', user.id)
        .is('check_out_at', null)
        .order('check_in_at', { ascending: false })
        .limit(1)
        .single();

      setActiveShift(active);

      // Get recent shifts
      const { data: recent } = await supabase
        .from('worker_shifts')
        .select('*')
        .eq('estate_id', currentEstate.id)
        .eq('user_id', user.id)
        .not('check_out_at', 'is', null)
        .order('check_in_at', { ascending: false })
        .limit(5);

      setRecentShifts(recent || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error(language === 'es' ? 'No se pudo acceder a la cámara' : 'Could not access camera');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoData(dataUrl);
    }
    
    stopCamera();
  }

  async function uploadPhoto(dataUrl: string): Promise<string | null> {
    try {
      const base64Data = dataUrl.split(',')[1];
      const bytes = atob(base64Data);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        arr[i] = bytes.charCodeAt(i);
      }
      const blob = new Blob([arr], { type: 'image/jpeg' });
      
      const fileName = `checkins/${user?.id}/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  }

  async function handleCheckIn() {
    if (!currentEstate || !user || !photoData) {
      toast.error(language === 'es' ? 'Se requiere foto para el registro' : 'Photo required for check-in');
      return;
    }

    setSubmitting(true);
    try {
      // Get location
      await getCurrentPosition();
      
      // Upload photo
      const photoUrl = await uploadPhoto(photoData);

      const { error } = await supabase.from('worker_shifts').insert({
        estate_id: currentEstate.id,
        user_id: user.id,
        check_in_lat: latitude,
        check_in_lng: longitude,
        check_in_photo_url: photoUrl,
        notes
      });

      if (error) throw error;
      
      toast.success(language === 'es' ? '✅ Entrada registrada' : '✅ Check-in recorded');
      setPhotoData(null);
      setNotes('');
      fetchShifts();
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error(language === 'es' ? 'Error al registrar entrada' : 'Failed to check in');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    if (!activeShift || !photoData) {
      toast.error(language === 'es' ? 'Se requiere foto para salir' : 'Photo required for check-out');
      return;
    }

    setSubmitting(true);
    try {
      await getCurrentPosition();
      const photoUrl = await uploadPhoto(photoData);

      const { error } = await supabase
        .from('worker_shifts')
        .update({
          check_out_at: new Date().toISOString(),
          check_out_lat: latitude,
          check_out_lng: longitude,
          check_out_photo_url: photoUrl
        })
        .eq('id', activeShift.id);

      if (error) throw error;
      
      toast.success(language === 'es' ? '✅ Salida registrada' : '✅ Check-out recorded');
      setPhotoData(null);
      setActiveShift(null);
      fetchShifts();
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error(language === 'es' ? 'Error al registrar salida' : 'Failed to check out');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDuration(start: string, end?: string | null) {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const diff = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  if (loading) {
    return (
      <ModernAppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ModernAppLayout>
    );
  }

  return (
    <ModernAppLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold">
            {language === 'es' ? 'Registro de Turno' : 'Shift Check-in'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {language === 'es' 
              ? 'Registra tu entrada y salida con foto y ubicación' 
              : 'Record your check-in and check-out with photo and location'}
          </p>
        </div>

        {/* Active Shift Status */}
        {activeShift ? (
          <Card className="border-primary bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-primary">
                <Clock className="h-4 w-4 animate-pulse" />
                {language === 'es' ? 'Turno Activo' : 'Active Shift'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatDuration(activeShift.check_in_at)}</p>
              <p className="text-sm text-muted-foreground">
                {language === 'es' ? 'Inicio:' : 'Started:'} {new Date(activeShift.check_in_at).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {language === 'es' ? 'No hay turno activo' : 'No active shift'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Camera/Photo Section */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {showCamera ? (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={capturePhoto}>
                    <Camera className="h-4 w-4 mr-2" />
                    {language === 'es' ? 'Capturar' : 'Capture'}
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </Button>
                </div>
              </div>
            ) : photoData ? (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                  <img src={photoData} alt="Captured" className="w-full h-full object-cover" />
                </div>
                <Button variant="outline" className="w-full" onClick={() => {
                  setPhotoData(null);
                  startCamera();
                }}>
                  {language === 'es' ? 'Tomar otra foto' : 'Take another photo'}
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full h-32" onClick={startCamera}>
                <div className="text-center">
                  <Camera className="h-8 w-8 mx-auto mb-2" />
                  <p>{language === 'es' ? 'Tomar Selfie' : 'Take Selfie'}</p>
                </div>
              </Button>
            )}

            {/* Location Status */}
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`h-4 w-4 ${hasLocation ? 'text-green-500' : 'text-muted-foreground'}`} />
              {geoLoading ? (
                <span className="text-muted-foreground">{language === 'es' ? 'Obteniendo ubicación...' : 'Getting location...'}</span>
              ) : hasLocation ? (
                <span className="text-green-600">{language === 'es' ? 'Ubicación obtenida' : 'Location acquired'}</span>
              ) : (
                <span className="text-muted-foreground">{geoError || (language === 'es' ? 'Ubicación no disponible' : 'Location unavailable')}</span>
              )}
            </div>

            {/* Notes */}
            <Textarea
              placeholder={language === 'es' ? 'Notas (opcional)...' : 'Notes (optional)...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            {/* Action Buttons */}
            {activeShift ? (
              <Button 
                className="w-full gap-2" 
                variant="destructive"
                onClick={handleCheckOut}
                disabled={submitting || !photoData}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {language === 'es' ? 'Registrar Salida' : 'Check Out'}
              </Button>
            ) : (
              <Button 
                className="w-full gap-2" 
                onClick={handleCheckIn}
                disabled={submitting || !photoData}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {language === 'es' ? 'Registrar Entrada' : 'Check In'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent Shifts */}
        {recentShifts.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-sm text-muted-foreground">
              {language === 'es' ? 'Turnos Recientes' : 'Recent Shifts'}
            </h2>
            <div className="grid gap-2">
              {recentShifts.map((shift) => (
                <Card key={shift.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(shift.check_in_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(shift.check_in_at).toLocaleTimeString()} - {new Date(shift.check_out_at!).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(shift.check_in_at, shift.check_out_at)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModernAppLayout>
  );
}
