import React, { useState } from 'react';
import { 
  Camera, 
  X, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  title_es: string | null;
  description: string | null;
  description_es: string | null;
  due_date: string;
  required_photo: boolean;
  zone?: {
    id: string;
    name: string;
  };
  asset?: {
    id: string;
    name: string;
  };
}

interface TaskCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSuccess?: () => void;
}

export function TaskCompletionDialog({ 
  open, 
  onOpenChange, 
  task,
  onSuccess 
}: TaskCompletionDialogProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const photoCapture = usePhotoCapture();
  
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setNotes('');
      photoCapture.reset();
    }
  }, [open]);

  if (!task) return null;

  const taskTitle = language === 'es' && task.title_es ? task.title_es : task.title;
  const taskDescription = language === 'es' && task.description_es 
    ? task.description_es 
    : task.description;

  async function handleSubmit() {
    if (!task || !user) {
      toast.error('Missing task or user');
      return;
    }

    if (task.required_photo && !photoCapture.hasPhoto) {
      toast.error(language === 'es' ? 'Se requiere foto' : 'Photo is required');
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl: string | null = null;

      // Upload photo to Supabase Storage
      if (photoCapture.photoFile) {
        const fileExt = photoCapture.photoFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/tasks/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photoCapture.photoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(language === 'es' ? 'Error al subir foto' : 'Failed to upload photo');
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);
        
        photoUrl = publicUrl;
      }

      // Create task completion record
      const { error: completionError } = await supabase
        .from('task_completions')
        .insert({
          task_id: task.id,
          completed_by_user_id: user.id,
          completed_at: new Date().toISOString(),
          photo_url: photoUrl,
          notes: notes || null,
        });

      if (completionError) throw completionError;

      // Update task status to completed
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', task.id);

      if (taskError) throw taskError;

      toast.success(
        language === 'es' 
          ? '¡Tarea completada!' 
          : 'Task completed!'
      );
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error(
        language === 'es' 
          ? 'Error al completar tarea' 
          : 'Failed to complete task'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {language === 'es' ? 'Completar Tarea' : 'Complete Task'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Task Info */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <h3 className="font-medium">{taskTitle}</h3>
            {taskDescription && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {taskDescription}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
              {task.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(task.due_date), 'MMM d, yyyy')}
                </span>
              )}
              {task.zone && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {task.zone.name}
                </span>
              )}
            </div>
            {task.required_photo && (
              <Badge variant="outline" className="mt-2 border-primary/30 text-primary">
                <Camera className="h-3 w-3 mr-1" />
                {language === 'es' ? 'Se requiere foto' : 'Photo required'}
              </Badge>
            )}
          </div>

          {/* Photo Capture */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {task.required_photo 
                ? (language === 'es' ? 'Foto (requerida)' : 'Photo (required)')
                : (language === 'es' ? 'Foto (opcional)' : 'Photo (optional)')
              }
            </Label>
            
            <input
              ref={photoCapture.inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={photoCapture.handleFileChange}
              className="hidden"
            />

            {photoCapture.hasPhoto ? (
              <div className="relative">
                <img
                  src={photoCapture.photoPreview || ''}
                  alt="Completion photo"
                  className="w-full h-48 object-cover rounded-xl border border-border"
                />
                <button
                  onClick={photoCapture.clearPhoto}
                  className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur rounded-full hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={photoCapture.openCamera}
                className={cn(
                  "w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-colors",
                  task.required_photo 
                    ? "border-primary/30 hover:border-primary/50 hover:bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-secondary/30"
                )}
              >
                <Camera className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Tomar foto o seleccionar' : 'Take photo or select'}
                </span>
              </button>
            )}
            
            {photoCapture.error && (
              <p className="text-sm text-destructive">{photoCapture.error}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Notas (opcional)' : 'Notes (optional)'}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'es' ? 'Añadir observaciones...' : 'Add observations...'}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={(task.required_photo && !photoCapture.hasPhoto) || submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === 'es' ? 'Completando...' : 'Completing...'}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Marcar Completada' : 'Mark Complete'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
