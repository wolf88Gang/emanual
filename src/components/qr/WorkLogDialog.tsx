import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Loader2, 
  CheckCircle, 
  Plus,
  Send,
  Pencil,
  Trash2,
  MessageSquare,
  Clock,
  Package,
  AlertTriangle,
  ListTodo
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorkLogEntry {
  id: string;
  raw_text: string;
  processed_text?: string;
  entry_type: 'work' | 'issue' | 'materials' | 'pending';
}

interface WorkLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string;
  assetName?: string;
  zoneName?: string;
  onComplete: () => void;
}

const ENTRY_TYPE_CONFIG = {
  work: { 
    icon: CheckCircle, 
    label: { es: 'Trabajo realizado', en: 'Work completed' },
    color: 'text-green-600 bg-green-100'
  },
  issue: { 
    icon: AlertTriangle, 
    label: { es: 'Incidencia', en: 'Issue' },
    color: 'text-red-600 bg-red-100'
  },
  materials: { 
    icon: Package, 
    label: { es: 'Materiales usados', en: 'Materials used' },
    color: 'text-blue-600 bg-blue-100'
  },
  pending: { 
    icon: ListTodo, 
    label: { es: 'Pendiente', en: 'Pending' },
    color: 'text-yellow-600 bg-yellow-100'
  },
};

export function WorkLogDialog({ 
  open, 
  onOpenChange, 
  shiftId,
  assetName,
  zoneName,
  onComplete 
}: WorkLogDialogProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [currentType, setCurrentType] = useState<WorkLogEntry['entry_type']>('work');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check for Web Speech API support
  const speechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize speech recognition
  useEffect(() => {
    if (!speechSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'es' ? 'es-CR' : 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setCurrentText(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        toast.error(language === 'es' ? 'Permiso de micrófono denegado' : 'Microphone permission denied');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [language, speechSupported]);

  function toggleRecording() {
    if (!recognitionRef.current) {
      toast.error(language === 'es' ? 'Reconocimiento de voz no soportado' : 'Speech recognition not supported');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
      }
    }
  }

  function addEntry() {
    if (!currentText.trim()) return;

    const newEntry: WorkLogEntry = {
      id: `temp-${Date.now()}`,
      raw_text: currentText.trim(),
      entry_type: currentType,
    };

    setEntries(prev => [...prev, newEntry]);
    setCurrentText('');
    
    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function updateEntry(id: string, text: string) {
    setEntries(prev => prev.map(e => 
      e.id === id ? { ...e, raw_text: text } : e
    ));
    setEditingEntry(null);
  }

  async function handleSubmit() {
    if (entries.length === 0) {
      toast.error(language === 'es' ? 'Agrega al menos una entrada' : 'Add at least one entry');
      return;
    }

    setSubmitting(true);
    try {
      // Save work log entries
      const { error: entriesError } = await supabase
        .from('work_log_entries')
        .insert(
          entries.map(entry => ({
            shift_id: shiftId,
            raw_text: entry.raw_text,
            entry_type: entry.entry_type,
          }))
        );

      if (entriesError) throw entriesError;

      // Combine all entries into work description
      const workDescription = entries
        .map(e => `[${ENTRY_TYPE_CONFIG[e.entry_type].label[language]}] ${e.raw_text}`)
        .join('\n');

      // Update shift with work description
      const { error: shiftError } = await supabase
        .from('worker_shifts')
        .update({
          work_description: workDescription,
          work_description_raw: entries.map(e => e.raw_text),
        })
        .eq('id', shiftId);

      if (shiftError) throw shiftError;

      // Create validation record (pending status)
      const { error: validationError } = await supabase
        .from('shift_validations')
        .insert({
          shift_id: shiftId,
          status: 'pending',
        });

      if (validationError) throw validationError;

      toast.success(language === 'es' ? '✅ Registro guardado' : '✅ Log saved');
      onComplete();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving work log:', err);
      toast.error(language === 'es' ? 'Error al guardar' : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {language === 'es' ? 'Registrar Trabajo' : 'Log Work'}
          </DialogTitle>
          {(assetName || zoneName) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              {assetName && <Badge variant="outline">{assetName}</Badge>}
              {zoneName && <Badge variant="secondary">{zoneName}</Badge>}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Entry Type Selector */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(ENTRY_TYPE_CONFIG).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={type}
                  variant={currentType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentType(type as WorkLogEntry['entry_type'])}
                  className="gap-1"
                >
                  <Icon className="h-3 w-3" />
                  {config.label[language]}
                </Button>
              );
            })}
          </div>

          {/* Text Input with Voice */}
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                placeholder={
                  language === 'es' 
                    ? 'Describe el trabajo realizado...' 
                    : 'Describe the work done...'
                }
                className={cn(
                  "min-h-[100px] pr-12 resize-none",
                  isRecording && "border-red-500 ring-2 ring-red-200"
                )}
              />
              
              {/* Voice Button */}
              {speechSupported && (
                <Button
                  variant={isRecording ? 'destructive' : 'secondary'}
                  size="icon"
                  className="absolute bottom-2 right-2"
                  onClick={toggleRecording}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {isRecording && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {language === 'es' ? 'Grabando...' : 'Recording...'}
              </div>
            )}

            <Button 
              onClick={addEntry} 
              disabled={!currentText.trim()}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              {language === 'es' ? 'Agregar entrada' : 'Add entry'}
            </Button>
          </div>

          {/* Entries List */}
          {entries.length > 0 && (
            <ScrollArea className="flex-1 max-h-[200px]">
              <div className="space-y-2 pr-4">
                {entries.map((entry) => {
                  const config = ENTRY_TYPE_CONFIG[entry.entry_type];
                  const Icon = config.icon;
                  
                  return (
                    <Card key={entry.id}>
                      <CardContent className="p-3">
                        {editingEntry === entry.id ? (
                          <div className="space-y-2">
                            <Textarea
                              defaultValue={entry.raw_text}
                              className="min-h-[60px]"
                              autoFocus
                              onBlur={(e) => updateEntry(entry.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  updateEntry(entry.id, e.currentTarget.value);
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className={cn(
                              "p-1 rounded",
                              config.color
                            )}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <p className="flex-1 text-sm">{entry.raw_text}</p>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setEditingEntry(entry.id)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removeEntry(entry.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={entries.length === 0 || submitting}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {language === 'es' ? 'Guardar y Cerrar' : 'Save & Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}