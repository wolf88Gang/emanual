import { describe, expect, it } from 'vitest';
import { buildManualDocument, manualToPlainText, manualText } from '@/lib/manualRender';

const snapshot = {
  version: 1,
  generated_at: '2026-08-18T00:00:00.000Z',
  property: { name: 'Mall Oeste — Lobby', address: 'Santa Ana' },
  client: { name: 'Raíz Cliente S.A.' },
  services: ['mantenimiento', 'manual'],
  plants: [
    {
      name: 'Zamioculca',
      location: 'Piso 1 · Lobby · Entrada',
      // deliberately nested: the old renderer produced [object Object] here
      pot: { material: 'ceramica', diameter_cm: 40, has_drainage: true },
      water: 'Cada 10 días',
      light: { required: 'luz_indirecta', actual: 'sombra' },
      responsibility: 'raiz_y_forma',
      client_instructions: null,
      do_not_do: 'No mover de lugar',
    },
  ],
  contact_note: 'WhatsApp 8888-8888',
};

describe('manual snapshot rendering', () => {
  it('never serializes nested values as [object Object]', () => {
    const doc = buildManualDocument(snapshot, { approvedAt: '2026-08-18T00:00:00.000Z' });
    const serialized = JSON.stringify(doc);
    expect(serialized).not.toContain('[object Object]');
    expect(manualToPlainText(doc).join('\n')).not.toContain('[object Object]');
  });

  it('renders nested pot and light data as readable text', () => {
    const doc = buildManualDocument(snapshot);
    const plant = doc.sections.find((s) => s.title === 'Zamioculca');
    expect(plant).toBeTruthy();
    const pot = plant!.lines.find((l) => l.label === 'Maceta')!.value;
    expect(pot).toContain('ceramica');
    expect(pot).toContain('40');
    const light = plant!.lines.find((l) => l.label === 'Luz')!.value;
    expect(light).toContain('luz_indirecta');
  });

  it('is defensive with malformed snapshots', () => {
    const doc = buildManualDocument({ plants: [{}, null], property: null } as unknown);
    expect(JSON.stringify(doc)).not.toContain('[object Object]');
    expect(manualText({ a: { b: 1 } })).not.toContain('[object Object]');
  });

  it('translates responsibility to client wording', () => {
    const doc = buildManualDocument(snapshot);
    const plant = doc.sections.find((s) => s.title === 'Zamioculca')!;
    expect(plant.lines.find((l) => l.label === 'Responsable')!.value).toBe('Raíz y Forma');
  });
});
