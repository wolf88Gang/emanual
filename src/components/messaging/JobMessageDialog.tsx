import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read_at: string | null;
}

interface JobMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  otherUserId: string;
  otherUserName: string;
}

export function JobMessageDialog({ open, onOpenChange, jobId, otherUserId, otherUserName }: JobMessageDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const es = language === 'es';
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && jobId && user) {
      fetchMessages();
      const channel = supabase
        .channel(`job-messages-${jobId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'job_messages',
          filter: `job_id=eq.${jobId}`,
        }, (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            setMessages(prev => [...prev, msg]);
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [open, jobId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('job_messages')
      .select('*')
      .eq('job_id', jobId)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true });
    setMessages((data as any[]) || []);

    // Mark unread as read
    await supabase
      .from('job_messages')
      .update({ read_at: new Date().toISOString() } as any)
      .eq('job_id', jobId)
      .eq('receiver_id', user.id)
      .is('read_at', null);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('job_messages').insert({
        job_id: jobId,
        sender_id: user.id,
        receiver_id: otherUserId,
        content: newMessage.trim(),
      } as any);
      if (error) throw error;
      setNewMessage('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col h-[70vh] max-h-[600px]">
        <DialogHeader>
          <DialogTitle>{es ? 'Chat con' : 'Chat with'} {otherUserName}</DialogTitle>
          <DialogDescription>{es ? 'Mensajes en tiempo real' : 'Real-time messages'}</DialogDescription>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 pr-3">
          <div className="space-y-2 py-2">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                {es ? 'Sin mensajes aún. ¡Envía el primero!' : 'No messages yet. Send the first one!'}
              </p>
            )}
            {messages.map(msg => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                    isMine
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}>
                    {msg.content}
                    <div className={cn('text-[10px] mt-0.5', isMine ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder={es ? 'Escribe un mensaje...' : 'Type a message...'}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
