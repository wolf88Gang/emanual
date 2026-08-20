import { MODULE_KEYS, type ModuleKey } from '@/lib/homeGuideModules';

/**
 * ONE canonical product taxonomy for Home Guide.
 *
 * Three independent dimensions — never mixed again:
 *  1. account scope     — what is being set up (business / individual / worker)
 *  2. business archetype — what kind of operation it is
 *  3. role               — what the logged-in person may do (auth layer only)
 *
 * Modules (what functionality is enabled) live in `homeGuideModules.ts`.
 */

export type AccountScope = 'business' | 'individual' | 'worker';

export const ARCHETYPE_KEYS = [
  'plant_services',
  'landscaping_services',
  'property_services',
  'property_management',
  'asset_service',
  'general_service',
  'individual',
] as const;

export type BusinessArchetype = (typeof ARCHETYPE_KEYS)[number];

type L3 = { en: string; es: string; de: string };
const L = (en: string, es: string, de: string): L3 => ({ en, es, de });

export function pick(l: L3, language: string): string {
  return language === 'es' ? l.es : language === 'de' ? l.de : l.en;
}

/** Semantic entity labels — the DB entity stays `estates` regardless. */
export interface EntityLabels {
  client: L3;
  project: L3;
  projectPlural: L3;
  asset: L3;
}

export interface ArchetypeDefinition {
  key: BusinessArchetype;
  label: L3;
  description: L3;
  /** Suggested (never forced) initial module configuration. */
  suggestedModules: ModuleKey[];
  /** Where this kind of account lands after sign-in. */
  landingRoute: string;
  entityLabels: EntityLabels;
  /** Offered as a business archetype choice during onboarding. */
  selectableAsBusiness: boolean;
}

const genericEntities: EntityLabels = {
  client: L('Client', 'Cliente', 'Kunde'),
  project: L('Project', 'Proyecto', 'Projekt'),
  projectPlural: L('Projects', 'Proyectos', 'Projekte'),
  asset: L('Asset', 'Activo', 'Anlage'),
};

export const ARCHETYPES: Record<BusinessArchetype, ArchetypeDefinition> = {
  plant_services: {
    key: 'plant_services',
    label: L(
      'Plant Care & Interior Landscaping',
      'Cuidado de Plantas y Paisajismo Interior',
      'Pflanzenpflege & Innenraumbegrünung',
    ),
    description: L(
      'Manage plants, maintenance, installations, rentals or plant services for clients.',
      'Gestiona plantas, mantenimiento, instalaciones, alquileres u otros servicios de plantas para clientes.',
      'Pflanzen, Pflege, Installationen, Vermietung oder Pflanzenservices für Kunden verwalten.',
    ),
    suggestedModules: ['clients', 'projects', 'plants_pots', 'reminders', 'client_portal', 'care'],
    landingRoute: '/clients',
    entityLabels: {
      client: L('Client', 'Cliente', 'Kunde'),
      project: L('Site', 'Sitio', 'Standort'),
      projectPlural: L('Sites', 'Sitios', 'Standorte'),
      asset: L('Plant', 'Planta', 'Pflanze'),
    },
    selectableAsBusiness: true,
  },
  landscaping_services: {
    key: 'landscaping_services',
    label: L(
      'Landscaping & Grounds Services',
      'Paisajismo y Mantenimiento de Áreas Verdes',
      'Landschaftsbau & Grünflächenpflege',
    ),
    description: L(
      'For companies managing gardens, landscaping, maintenance and field work.',
      'Para empresas que gestionan jardines, paisajismo, mantenimiento y trabajo de campo.',
      'Für Unternehmen mit Gärten, Landschaftsbau, Pflege und Außendienst.',
    ),
    suggestedModules: ['clients', 'projects', 'assets', 'map', 'tasks', 'visits', 'reminders', 'documents'],
    landingRoute: '/clients',
    entityLabels: {
      client: L('Client', 'Cliente', 'Kunde'),
      project: L('Site', 'Sitio', 'Standort'),
      projectPlural: L('Sites', 'Sitios', 'Standorte'),
      asset: L('Asset', 'Activo', 'Anlage'),
    },
    selectableAsBusiness: true,
  },
  property_services: {
    key: 'property_services',
    label: L(
      'Property Services & Maintenance',
      'Servicios y Mantenimiento de Propiedades',
      'Immobilienservice & Instandhaltung',
    ),
    description: L(
      'For businesses managing maintenance and services across client properties.',
      'Para empresas que gestionan mantenimiento y servicios en propiedades de clientes.',
      'Für Unternehmen, die Instandhaltung und Services in Kundenobjekten steuern.',
    ),
    suggestedModules: ['clients', 'projects', 'assets', 'tasks', 'reminders', 'documents'],
    landingRoute: '/clients',
    entityLabels: {
      client: L('Client', 'Cliente', 'Kunde'),
      project: L('Property', 'Propiedad', 'Objekt'),
      projectPlural: L('Properties', 'Propiedades', 'Objekte'),
      asset: L('Asset', 'Activo', 'Anlage'),
    },
    selectableAsBusiness: true,
  },
  property_management: {
    key: 'property_management',
    label: L('Property Management', 'Administración de Propiedades', 'Immobilienverwaltung'),
    description: L(
      'For businesses administering properties on behalf of owners.',
      'Para empresas que administran propiedades en nombre de los dueños.',
      'Für Unternehmen, die Objekte im Auftrag der Eigentümer verwalten.',
    ),
    suggestedModules: ['clients', 'projects', 'tasks', 'documents', 'billing_payments', 'reminders'],
    landingRoute: '/clients',
    entityLabels: {
      client: L('Owner', 'Propietario', 'Eigentümer'),
      project: L('Property', 'Propiedad', 'Objekt'),
      projectPlural: L('Properties', 'Propiedades', 'Objekte'),
      asset: L('Asset', 'Activo', 'Anlage'),
    },
    selectableAsBusiness: true,
  },
  asset_service: {
    key: 'asset_service',
    label: L('Asset & Equipment Services', 'Gestión de Activos y Equipos', 'Anlagen- & Geräteservice'),
    description: L(
      'For companies primarily tracking customer assets, equipment and maintenance.',
      'Para empresas que registran activos y equipos de clientes y su mantenimiento.',
      'Für Unternehmen, die Kundenanlagen, Geräte und Wartung erfassen.',
    ),
    suggestedModules: ['clients', 'projects', 'assets', 'reminders'],
    landingRoute: '/clients',
    entityLabels: {
      client: L('Client', 'Cliente', 'Kunde'),
      project: L('Service site', 'Sitio de servicio', 'Servicestandort'),
      projectPlural: L('Service sites', 'Sitios de servicio', 'Servicestandorte'),
      asset: L('Equipment', 'Equipo', 'Gerät'),
    },
    selectableAsBusiness: true,
  },
  general_service: {
    key: 'general_service',
    label: L('General Service Business', 'Empresa de Servicios', 'Dienstleistungsunternehmen'),
    description: L(
      'For companies whose workflow does not fit the predefined examples.',
      'Para empresas cuyo flujo de trabajo no coincide con los ejemplos predefinidos.',
      'Für Unternehmen, deren Abläufe nicht in die Beispiele passen.',
    ),
    suggestedModules: ['clients', 'projects'],
    landingRoute: '/clients',
    entityLabels: genericEntities,
    selectableAsBusiness: true,
  },
  individual: {
    key: 'individual',
    label: L('My own property or assets', 'Mis propiedades o activos', 'Eigene Immobilien oder Anlagen'),
    description: L(
      'Track your own property, assets and maintenance.',
      'Gestione su propia propiedad, activos y mantenimiento.',
      'Eigene Immobilie, Anlagen und Wartung verwalten.',
    ),
    suggestedModules: ['assets', 'map', 'tasks', 'documents', 'reminders'],
    landingRoute: '/',
    entityLabels: {
      client: L('Client', 'Cliente', 'Kunde'),
      project: L('Property', 'Propiedad', 'Immobilie'),
      projectPlural: L('Properties', 'Propiedades', 'Immobilien'),
      asset: L('Asset', 'Activo', 'Anlage'),
    },
    selectableAsBusiness: false,
  },
};

export const BUSINESS_ARCHETYPES: ArchetypeDefinition[] = ARCHETYPE_KEYS
  .map((k) => ARCHETYPES[k])
  .filter((a) => a.selectableAsBusiness);

/** Legacy `organizations.org_type` → canonical archetype (non-destructive read mapping). */
export function archetypeFromLegacyOrgType(orgType: string | null | undefined): BusinessArchetype {
  switch (orgType) {
    case 'plant_rental':
      return 'plant_services';
    case 'landscaping_company':
    case 'hybrid':
      return 'landscaping_services';
    case 'property_management':
      return 'property_management';
    case 'residential':
      return 'individual';
    default:
      return 'general_service';
  }
}

export function resolveArchetype(
  businessArchetype: string | null | undefined,
  orgType: string | null | undefined,
): BusinessArchetype {
  if (businessArchetype && (ARCHETYPE_KEYS as readonly string[]).includes(businessArchetype)) {
    return businessArchetype as BusinessArchetype;
  }
  return archetypeFromLegacyOrgType(orgType);
}

export function resolveAccountScope(
  accountScope: string | null | undefined,
  archetype: BusinessArchetype,
): AccountScope {
  if (accountScope === 'business' || accountScope === 'individual' || accountScope === 'worker') return accountScope;
  return archetype === 'individual' ? 'individual' : 'business';
}

/** Suggested modules of an archetype as a full flag map. */
export function suggestedModuleFlags(archetype: BusinessArchetype): Record<ModuleKey, boolean> {
  const enabled = ARCHETYPES[archetype].suggestedModules;
  const out = {} as Record<ModuleKey, boolean>;
  for (const k of MODULE_KEYS) out[k] = enabled.includes(k);
  return out;
}

export function archetypeLabel(archetype: BusinessArchetype, language: string): string {
  return pick(ARCHETYPES[archetype].label, language);
}

export function archetypeDescription(archetype: BusinessArchetype, language: string): string {
  return pick(ARCHETYPES[archetype].description, language);
}

/** Centralized semantic labels — no scattered ternaries in components. */
export function getEntityLabels(archetype: BusinessArchetype, language: string) {
  const e = ARCHETYPES[archetype].entityLabels;
  return {
    client: pick(e.client, language),
    project: pick(e.project, language),
    projectPlural: pick(e.projectPlural, language),
    asset: pick(e.asset, language),
  };
}

export function landingRoute(archetype: BusinessArchetype): string {
  return ARCHETYPES[archetype].landingRoute;
}
