import type { Language } from '@/lib/i18n';

export type CareProtocolLanguage = Extract<Language, 'en' | 'es' | 'de'>;

interface LocalizedCareProtocol {
  versions: Partial<Record<CareProtocolLanguage, any>>;
  updatedAt?: string;
}

const LANGUAGE_INDICATORS: Record<CareProtocolLanguage, string[]> = {
  en: ['every', 'daily', 'weekly', 'water', 'hours', 'apply', 'avoid', 'full sun', 'morning'],
  es: ['cada', 'diario', 'semanal', 'riego', 'horas', 'aplicar', 'evitar', 'sol pleno', 'mañana'],
  de: ['jede', 'täglich', 'wöchentlich', 'gießen', 'stunden', 'anwenden', 'vermeiden', 'volle sonne', 'morgens'],
};

export function isLocalizedCareProtocol(value: any): value is LocalizedCareProtocol {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.versions && typeof value.versions === 'object');
}

export function getCareProtocolForLanguage(value: any, language: CareProtocolLanguage) {
  if (!value) return null;

  if (!isLocalizedCareProtocol(value)) {
    return value;
  }

  return (
    value.versions[language] ??
    value.versions.en ??
    value.versions.es ??
    value.versions.de ??
    Object.values(value.versions).find(Boolean) ??
    null
  );
}

export function setCareProtocolForLanguage(value: any, language: CareProtocolLanguage, protocol: any): LocalizedCareProtocol {
  const previousVersions = isLocalizedCareProtocol(value) ? value.versions : {};

  return {
    versions: {
      ...previousVersions,
      [language]: protocol,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function detectCareProtocolLanguage(value: any): CareProtocolLanguage | null {
  const protocol = isLocalizedCareProtocol(value)
    ? Object.values(value.versions).find(Boolean)
    : value;

  if (!protocol) return null;

  const text = JSON.stringify(protocol).toLowerCase();
  const scores = Object.entries(LANGUAGE_INDICATORS).map(([language, words]) => ({
    language: language as CareProtocolLanguage,
    score: words.filter((word) => text.includes(word)).length,
  }));

  scores.sort((a, b) => b.score - a.score);

  if (!scores[0] || scores[0].score === 0) return null;
  if (scores[1] && scores[0].score === scores[1].score) return null;

  return scores[0].language;
}

export function needsCareProtocolForLanguage(value: any, language: CareProtocolLanguage): boolean {
  if (!value) return false;

  if (isLocalizedCareProtocol(value)) {
    return !value.versions[language];
  }

  const detectedLanguage = detectCareProtocolLanguage(value);
  return detectedLanguage ? detectedLanguage !== language : false;
}
