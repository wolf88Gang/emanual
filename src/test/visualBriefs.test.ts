import { describe, expect, it } from 'vitest';
import { allowedActions, fitWithin } from '@/lib/visualBriefs';

describe('visual brief transition matrix (UI mirror)', () => {
  it('lets the requester edit and submit a draft', () => {
    expect(allowedActions('draft', 'client', true, false, false)).toEqual(['edit_request', 'submit']);
  });
  it('blocks strangers', () => {
    expect(allowedActions('draft', null, false, false, false)).toEqual([]);
  });
  it('only professionals assess', () => {
    expect(allowedActions('professional_review', 'client', true, false, false)).not.toContain('assess');
    expect(allowedActions('professional_review', 'assignee', false, false, false)).toEqual(['clarify', 'assess']);
  });
  it('client agrees only after a proposal', () => {
    expect(allowedActions('professionally_validated', 'client', true, false, false)).not.toContain('agree');
    expect(allowedActions('professionally_validated', 'client', true, true, false)).toContain('agree');
  });
  it('manager agrees only for internal requests', () => {
    expect(allowedActions('professionally_validated', 'manager', false, true, false)).not.toContain('agree');
    expect(allowedActions('professionally_validated', 'manager', false, true, true)).toContain('agree');
  });
  it('completion only after agreement or adjustment', () => {
    expect(allowedActions('professionally_validated', 'assignee', false, true, false)).not.toContain('complete');
    expect(allowedActions('scope_agreed', 'assignee', false, true, false)).toContain('complete');
    expect(allowedActions('adjustment_requested', 'manager', false, true, false)).toContain('complete');
  });
  it('professional cannot review the result', () => {
    expect(allowedActions('result_submitted', 'assignee', false, true, false)).not.toContain('review');
    expect(allowedActions('result_submitted', 'client', true, true, false)).toContain('review');
  });
  it('approved briefs are closed', () => {
    expect(allowedActions('client_approved', 'manager', true, true, true)).toEqual([]);
  });
});

describe('image sizing', () => {
  it('keeps small images', () => expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 }));
  it('caps the long edge at 1600', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });
});
