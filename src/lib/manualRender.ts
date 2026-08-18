/**
 * Shared typed renderer for the approved manual snapshot.
 *
 * The snapshot is a nested object. Preview, public portal and PDF export must all
 * use this module so no nested value is ever stringified with `String(value)`
 * (which renders as "[object Object]").
 */

export interface ManualPlantBlock {
  name: string;
  location: string;
  pot: string | null;
  water: string;
  light: string | null;
  responsibility: string | null;
  client_instructions: string | null;
  do_not_do: string | null;
}

export interface ManualSnapshotShape {
  version?: number;
  generated_at?: string;
  property?: { name?: string | null; address?: string | null } | null;
  client?: { name?: string | null } | null;
  services?: unknown;
  plants?: unknown;
  contact_note?: string | null;
}

export interface ManualLine {
  label: string | null;
  value: string;
}

export interface ManualSection {
  title: string;
  lines: ManualLine[];
}

export interface ManualDocument {
  brand: string;
  title: string;
  approvedLabel: string | null;
  sections: ManualSection[];
}

const RESPONSIBILITY_ES: Record<string, string> = {
  raiz_y_forma: 'Raíz y Forma',
  cliente: 'Cliente',
  compartido: 'Compartido',
};

/** Formats any leaf value as human text. Objects/arrays are never leaked raw. */
export function manualText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.trim() || '—';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) {
    const parts = value.map(manualText).filter((v) => v !== '—');
    return parts.length ? parts.join(' · ') : '—';
  }
  if (typeof value === 'object') {
    const parts = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const text = manualText(v);
        return text === '—' ? null : `${k.replace(/_/g, ' ')}: ${text}`;
      })
      .filter(Boolean) as string[];
    return parts.length ? parts.join(' · ') : '—';
  }
  return '—';
}

function normalizePlant(raw: unknown): ManualPlantBlock {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    name: manualText(p.name),
    location: manualText(p.location),
    pot: p.pot == null ? null : manualText(p.pot),
    water: manualText(p.water),
    light: p.light == null ? null : manualText(p.light),
    responsibility:
      p.responsibility == null
        ? null
        : RESPONSIBILITY_ES[String(p.responsibility)] ?? manualText(p.responsibility),
    client_instructions: p.client_instructions == null ? null : manualText(p.client_instructions),
    do_not_do: p.do_not_do == null ? null : manualText(p.do_not_do),
  };
}

/** Builds the render-ready document from an approved snapshot of any shape. */
export function buildManualDocument(
  snapshot: unknown,
  opts: { approvedAt?: string | null } = {},
): ManualDocument {
  const s = (snapshot && typeof snapshot === 'object' ? snapshot : {}) as ManualSnapshotShape;
  const plants = Array.isArray(s.plants) ? s.plants.map(normalizePlant) : [];
  const services = Array.isArray(s.services)
    ? s.services.map((x) => manualText(x)).filter((x) => x !== '—')
    : s.services
      ? [manualText(s.services)]
      : [];

  const sections: ManualSection[] = [
    {
      title: 'Propiedad y cliente',
      lines: [
        { label: 'Propiedad', value: manualText(s.property?.name) },
        { label: 'Dirección', value: manualText(s.property?.address) },
        { label: 'Cliente', value: manualText(s.client?.name) },
      ],
    },
    {
      title: 'Servicios',
      lines: services.length ? services.map((v) => ({ label: null, value: v })) : [{ label: null, value: '—' }],
    },
  ];

  for (const p of plants) {
    sections.push({
      title: p.name,
      lines: [
        { label: 'Ubicación', value: p.location },
        { label: 'Maceta', value: p.pot ?? '—' },
        { label: 'Riego', value: p.water },
        { label: 'Luz', value: p.light ?? '—' },
        { label: 'Responsable', value: p.responsibility ?? '—' },
        { label: 'Indicaciones', value: p.client_instructions ?? '—' },
        { label: 'No hacer', value: p.do_not_do ?? '—' },
      ],
    });
  }

  if (s.contact_note) {
    sections.push({ title: 'Contacto', lines: [{ label: null, value: manualText(s.contact_note) }] });
  }

  const approvedAt = opts.approvedAt ?? null;

  return {
    brand: 'Raíz y Forma',
    title: `Manual de cuidados — ${manualText(s.property?.name)}`,
    approvedLabel: approvedAt
      ? `Versión aprobada el ${new Date(approvedAt).toLocaleDateString('es-CR')}`
      : null,
    sections,
  };
}

/** Flat text serialization used by the PDF export. */
export function manualToPlainText(doc: ManualDocument): string[] {
  const out: string[] = [doc.brand, doc.title];
  if (doc.approvedLabel) out.push(doc.approvedLabel);
  for (const section of doc.sections) {
    out.push('', section.title);
    for (const line of section.lines) {
      out.push(line.label ? `${line.label}: ${line.value}` : `• ${line.value}`);
    }
  }
  return out;
}
