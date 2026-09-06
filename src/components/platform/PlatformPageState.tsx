import React from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PlatformLoading() {
  return <div className="space-y-3" aria-label="Loading"><div className="h-20 animate-pulse rounded-md bg-muted" /><div className="h-40 animate-pulse rounded-md bg-muted" /></div>;
}

export function PlatformError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 p-8 text-center"><AlertCircle className="h-8 w-8 text-destructive" /><p className="text-sm text-muted-foreground">{message}</p><Button variant="outline" onClick={retry}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>;
}

export function PlatformEmpty({ message }: { message: string }) {
  return <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-10 text-center"><Inbox className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{message}</p></div>;
}