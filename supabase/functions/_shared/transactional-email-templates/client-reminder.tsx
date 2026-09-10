import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  /** Subject line, also used as the visible title. */
  subject?: string
  /** Plain-text reminder body (already localized when queued). */
  bodyText?: string
  clientName?: string | null
  projectName?: string | null
  language?: string
}

const FOOTER: Record<string, string> = {
  en: 'Sent by Home Guide on behalf of your service provider.',
  es: 'Enviado por Home Guide en nombre de su proveedor de servicio.',
  de: 'Gesendet von Home Guide im Auftrag Ihres Dienstleisters.',
}

const Email = ({ subject, bodyText, clientName, projectName, language }: Props) => {
  const lang = language === 'en' ? 'en' : language === 'de' ? 'de' : 'es'
  const title = subject || 'Home Guide'
  const where = [clientName, projectName].filter(Boolean).join(' · ')
  const lines = (bodyText || '').split('\n')

  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>HOME GUIDE</Text>
          <Heading style={heading}>{title}</Heading>
          {where && <Text style={meta}>{where}</Text>}
          <Section style={card}>
            {lines.map((line, i) =>
              line.trim() === '' ? (
                <Text key={i} style={spacer}>
                  &nbsp;
                </Text>
              ) : (
                <Text key={i} style={line === line.toUpperCase() ? bodyStrong : bodyLine}>
                  {line}
                </Text>
              ),
            )}
          </Section>
          <Hr style={hr} />
          <Text style={footer}>{FOOTER[lang]}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => (data?.subject as string) || 'Home Guide',
  displayName: 'Client reminder',
  previewData: {
    subject: 'Puede regar hoy: Ficus lyrata',
    bodyText:
      'PUEDE REGAR HOY\n\nFicus lyrata\nCasa Bahia Vista · Sala\n\nCantidad:\n1 litro\n\nDespués de regarla, no vuelva a regarla hasta recibir el próximo aviso.',
    clientName: 'Casa Bahia Vista',
    projectName: 'Sala principal',
    language: 'es',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Montserrat, Helvetica, Arial, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '600px' }
const brand = {
  fontSize: '12px',
  letterSpacing: '2px',
  color: '#16a34a',
  fontWeight: 700,
  margin: '0 0 12px',
}
const heading = { fontSize: '22px', lineHeight: '1.3', color: '#111827', margin: '0 0 6px' }
const meta = { fontSize: '13px', color: '#6b7280', margin: '0 0 18px' }
const card = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '18px 20px',
}
const bodyLine = { fontSize: '15px', lineHeight: '1.5', color: '#1f2937', margin: '0 0 4px' }
const bodyStrong = {
  fontSize: '15px',
  lineHeight: '1.5',
  color: '#111827',
  fontWeight: 700,
  margin: '0 0 4px',
}
const spacer = { fontSize: '8px', lineHeight: '8px', margin: '0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
