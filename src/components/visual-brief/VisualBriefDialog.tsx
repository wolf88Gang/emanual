import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  allowedActions, getBriefRole, loadBriefBundle, rpcErrorMessage, signAssets, uploadAndAttach,
  type Agreement, type Assessment, type BriefRole, type Match, type PendingPhoto,
} from '@/lib/visualBriefs';
import { BeforeTargetAfter } from './BeforeTargetAfter';
import { VisualPhotoPicker } from './VisualPhotoPicker';
import { useVbCopy } from './copy';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  briefId: string | null;
  orgId: string | null;
  task: { id: string; title: string; zone?: { name: string } | null; asset?: { id: string; name: string } | null } | null;
  onRequestComplete: () => void;
  onChanged?: () => void;
}

type Bundle = Awaited<ReturnType<typeof loadBriefBundle>>;

function Choice<T extends string>({ value, options, onChange }: { value: T | null; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(([k, label]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
          className={`min-h-11 rounded-md border px-3 py-2 text-sm text-left transition-colors ${value === k ? 'border-primary bg-background text-foreground ring-2 ring-primary' : 'border-border bg-background text-foreground hover:border-primary/60'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function VisualBriefDialog({ open, onOpenChange, briefId, orgId, task, onRequestComplete, onChanged }: Props) {
  const { t, es } = useVbCopy();
  const { user } = useAuth();
  const [data, setData] = useState<Bundle | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [role, setRole] = useState<BriefRole | null>(null);
  const [requesterInternal, setRequesterInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [notes, setNotes] = useState('');
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [scope, setScope] = useState('');
  const [match, setMatch] = useState<Match | null>(null);
  const [feedback, setFeedback] = useState('');
  const [clientText, setClientText] = useState('');
  const [newPhotos, setNewPhotos] = useState<PendingPhoto[]>([]);
  const [agreedPhotos, setAgreedPhotos] = useState<PendingPhoto[]>([]);

  const load = useCallback(async () => {
    if (!briefId || !task || !user) return;
    const b = await loadBriefBundle(briefId);
    setData(b);
    setUrls(await signAssets(b.assets));
    setRole(await getBriefRole(task.id, user.id));
    if (b.brief) {
      setRequesterInternal((await getBriefRole(task.id, b.brief.requested_by)) === 'manager');
      setAssessment(b.brief.professional_assessment);
      setNotes(b.brief.professional_notes ?? '');
      setAgreement(b.brief.proposed_agreement);
      setScope(b.brief.proposed_scope ?? '');
      setClientText(b.brief.client_description ?? '');
    }
  }, [briefId, task, user]);

  useEffect(() => { if (open) { setNewPhotos([]); setAgreedPhotos([]); setMatch(null); setFeedback(''); load(); } }, [open, load]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); await load(); onChanged?.(); }
    catch (e) { toast.error(rpcErrorMessage(e, es)); }
    finally { setBusy(false); }
  }
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const { error } = await supabase.rpc(name as any, args as any);
    if (error) throw error;
  };

  const brief = data?.brief;
  const actions = brief && user ? allowedActions(brief.status, role, brief.requested_by === user.id, !!brief.proposed_scope, requesterInternal) : [];
  const has = (a: string) => actions.includes(a as any);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t.desiredResult}</DialogTitle></DialogHeader>
        {!brief ? <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{task?.title}</h3>
                <Badge variant="outline">{t.status[brief.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {task?.asset && <>{t.plant}: {task.asset.name} · </>}{task?.zone && <>{t.location}: {task.zone.name}</>}
              </p>
            </div>

            <BeforeTargetAfter assets={data!.assets} urls={urls} pins={data!.pins} />

            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.instructions}</p>
              <p className="text-sm whitespace-pre-wrap">{brief.client_description || '—'}</p>
              <p className="flex items-start gap-1.5 pt-2 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />{t.disclaimer}</p>
            </div>

            {has('edit_request') && (
              <section className="space-y-3">
                {brief.status === 'needs_clarification' && brief.professional_notes && (
                  <p className="rounded-md border border-border p-3 text-sm"><strong>{t.askClarify}:</strong> {brief.professional_notes}</p>
                )}
                <VisualPhotoPicker kind="target_reference" label={t.reference} hint={t.referenceHint} photos={newPhotos} onChange={setNewPhotos} multiple />
                <Textarea value={clientText} onChange={e => setClientText(e.target.value)} rows={3} placeholder={t.whatChangePh} />
                <Button className="w-full h-11" disabled={busy} onClick={() => run(async () => {
                  for (const p of newPhotos) await uploadAndAttach(orgId!, brief.id, p);
                  await rpc('submit_visual_brief', { p_brief_id: brief.id, p_client_description: clientText || null });
                  toast.success(t.status.professional_review);
                })}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{brief.status === 'draft' ? t.submit : t.resubmit}</Button>
              </section>
            )}

            {has('assess') && (
              <section className="space-y-3">
                <h4 className="font-medium">{t.assessTitle}</h4>
                <Choice value={assessment} onChange={setAssessment} options={[['viable', t.viable], ['partial', t.partial], ['not_recommended', t.not_recommended], ['inspect_first', t.inspect_first]]} />
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={t.assessComment} />
                <div className="flex flex-wrap gap-2">
                  <Button className="h-11" disabled={busy || !assessment} onClick={() => run(() => rpc('assess_visual_brief', { p_brief_id: brief.id, p_assessment: assessment, p_notes: notes || null }))}>{t.saveAssessment}</Button>
                  {has('clarify') && (
                    <Button variant="outline" className="h-11" disabled={busy || !notes.trim()} onClick={() => run(() => rpc('request_visual_clarification', { p_brief_id: brief.id, p_note: notes }))}>{t.askClarify}</Button>
                  )}
                </div>
              </section>
            )}

            {has('propose') && (
              <section className="space-y-3">
                <h4 className="font-medium">{t.proposeTitle}</h4>
                <Choice value={agreement} onChange={setAgreement} options={[['exact', t.exact], ['approximate', t.approximate], ['modified', t.modified]]} />
                <Textarea value={scope} onChange={e => setScope(e.target.value)} rows={3} placeholder={t.scopePh} />
                {has('add_agreed_target') && <VisualPhotoPicker kind="agreed_target" label={t.agreedRef} photos={agreedPhotos} onChange={setAgreedPhotos} />}
                <Button className="h-11" disabled={busy || !agreement || !scope.trim()} onClick={() => run(async () => {
                  for (const p of agreedPhotos) await uploadAndAttach(orgId!, brief.id, p);
                  setAgreedPhotos([]);
                  await rpc('propose_visual_scope', { p_brief_id: brief.id, p_agreement: agreement, p_scope: scope });
                })}>{t.propose}</Button>
              </section>
            )}

            {(brief.professional_assessment || brief.proposed_scope || brief.agreed_scope) && (
              <section className="rounded-lg border border-border p-3 space-y-2 text-sm">
                <h4 className="font-medium">{t.agreeTitle}</h4>
                <p><span className="text-muted-foreground">{t.clientRequested}:</span> {brief.client_description || '—'}</p>
                {brief.professional_assessment && <p><span className="text-muted-foreground">{t.proRecommended}:</span> {t[brief.professional_assessment]}{brief.professional_notes ? ` — ${brief.professional_notes}` : ''}</p>}
                {(brief.agreed_scope || brief.proposed_scope) && (
                  <p><span className="text-muted-foreground">{t.agreed}:</span> {brief.proposed_agreement ? `${t[brief.proposed_agreement]} · ` : ''}{brief.agreed_scope ?? brief.proposed_scope}{!brief.agreed_scope && ' (…)'}</p>
                )}
                {has('agree') && <Button className="h-11 mt-1" disabled={busy} onClick={() => run(() => rpc('agree_visual_scope', { p_brief_id: brief.id }))}><CheckCircle className="h-4 w-4 mr-2" />{t.agree}</Button>}
              </section>
            )}

            {has('complete') && <Button className="w-full h-11" onClick={onRequestComplete}>{t.complete}</Button>}

            {has('review') && (
              <section className="space-y-3">
                <h4 className="font-medium">{t.reviewTitle}</h4>
                <Choice value={match} onChange={setMatch} options={[['yes', t.yes], ['partial', t.partialMatch], ['no', t.no]]} />
                <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2} placeholder={t.feedbackPh} />
                <div className="flex flex-wrap gap-2">
                  <Button className="h-11" disabled={busy || !match} onClick={() => run(() => rpc('review_visual_result', { p_brief_id: brief.id, p_match: match, p_action: 'approve', p_feedback: feedback || null }))}>{t.approve}</Button>
                  <Button variant="outline" className="h-11" disabled={busy || !match || !feedback.trim()} onClick={() => run(() => rpc('review_visual_result', { p_brief_id: brief.id, p_match: match, p_action: 'request_adjustment', p_feedback: feedback }))}>{t.adjust}</Button>
                </div>
              </section>
            )}

            <section className="space-y-2">
              <h4 className="font-medium text-sm">{t.timeline}</h4>
              <ol className="space-y-1.5 border-l border-border pl-4">
                {data!.events.map(ev => (
                  <li key={ev.id} className="text-sm">
                    <span className="text-muted-foreground text-xs mr-2">{format(new Date(ev.created_at), 'dd/MM/yy HH:mm')}</span>
                    {t.events[ev.event_type] ?? ev.event_type}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
