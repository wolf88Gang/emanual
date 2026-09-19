import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BookOpen, Building2, Camera, Check, ChevronDown,
  ClipboardCheck, Clock3, DollarSign, FileText, Globe2, Leaf, Lock,
  LogIn, MapPinned, Minus, PackageCheck, Plus, QrCode, ShieldCheck, Users,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Button } from '@/components/ui/button';
import { Seo } from '@/components/Seo';
import { ADDONS, ANNUAL_MONTHS_CHARGED, BASE_PRICE_PER_PROPERTY_USD, quote, type BillingInterval } from '@/lib/pricing';
import { CRC_PER_USD } from '@/lib/currency';

const copy = {
  en: {
    navCapabilities: 'Capabilities', navHow: 'How it works', navPricing: 'Pricing', signIn: 'Sign in', create: 'Create account',
    eyebrow: 'Operations for every site you care for', title: 'Home Guide',
    hero: 'Organize properties, field work and client records in one operational system. Every task stays connected to its place, its assets and its evidence.',
    explore: 'Explore the platform', proof: 'From site plan to proof of work',
    audience: 'Built for the work behind well-run places',
    audienceBody: 'Property managers, landscape teams, plant-rental operators, facilities crews and estate owners share one need: know what must happen, where it belongs and how it was completed.',
    capabilitiesEyebrow: 'One connected record', capabilitiesTitle: 'Organize. Execute. Document. Share.',
    capabilitiesBody: 'Home Guide connects the office, the field and the client without forcing every operation into the same mold.',
    stages: [
      ['Organize', 'Clients, sites, zones and assets form a clear hierarchy. Maps, documents and QR labels keep every record attached to a real place.'],
      ['Execute', 'Plan tasks, visits, care routines and shifts. Crews see only the work and tools relevant to their role.'],
      ['Document', 'Photo, time, location and immutable logs turn completed work into defensible operational evidence.'],
      ['Share', 'Client portals, property manuals, reports, reminders and separate charges turn field records into useful service.'],
    ],
    realWork: 'Designed around real operations', realWorkBody: 'Choose only the modules your team needs today. Add specialist workflows as the operation grows.',
    features: [
      ['Mapped sites', 'Satellite maps, drawn zones, GPS assets and KML/KMZ import.'],
      ['Tasks and visits', 'Spatial work orders, care queues, check-ins and guided visits.'],
      ['Field evidence', 'Photo, QR, time and location records tied to completed work.'],
      ['Plant care', 'Species and placement baselines, watering queues and replacements.'],
      ['Labor and tools', 'Shifts, rates, assignments, inventory and verified returns.'],
      ['Client delivery', 'Private portals, PDF manuals, reports, reminders and invoices.'],
    ],
    fieldEyebrow: 'A continuous workflow', fieldTitle: 'The record follows the work',
    fieldBody: 'Start with a mapped site. Assign work to the right person. Capture proof in the field. Give clients a clear view of what happened.',
    fieldSteps: ['Map the site', 'Assign the work', 'Capture evidence', 'Share the result'],
    pricingEyebrow: 'Simple, transparent pricing', pricingTitle: 'Build the account your operation needs',
    pricingBody: 'Start with the number of properties or sites. Add specialist modules only when you need them.',
    monthly: 'Monthly', annual: 'Annual', annualNote: 'Pay 10 months, use 12', properties: 'Properties', perProperty: 'per property / month',
    extras: 'Optional modules', accountMonth: 'account / month', summary: 'Your estimate', dueMonthly: 'per month', dueAnnual: 'billed annually', saving: 'You save', continue: 'Create account and continue',
    included: 'Included in every account', includedItems: ['Clients, sites and asset records', 'Tasks, evidence and reports', 'EN, ES and DE interface', 'USD and CRC display'],
    trustEyebrow: 'Designed for accountable work', trustTitle: 'Clear access. Private records. Auditable history.',
    trustItems: [
      ['Role-based access', 'Owners, managers and crews see the tools and records their work requires.'],
      ['Private evidence', 'Documents and photos use protected storage and short-lived access links.'],
      ['Traceable history', 'Check-ins, completions and care logs preserve who did what and when.'],
    ],
    faqTitle: 'Questions before you begin', faqs: [
      ['Can I create an account now?', 'Yes. Create your account, choose your configuration and complete payment with ONVO.'],
      ['What does annual billing mean?', 'You receive 12 months of service and are charged the equivalent of 10 months.'],
      ['Can I pay in colones?', 'Yes. Checkout supports USD and CRC, and the estimate can be viewed in either currency.'],
      ['Can I change my setup later?', 'Yes. You can add properties and optional modules as your operation changes.'],
    ],
    finalTitle: 'Give every site a reliable operating record', finalBody: 'Create your account, choose what you manage and activate Home Guide through secure ONVO checkout.',
    footer: 'Operations platform for property, landscape and facilities teams', secure: 'Secure checkout with ONVO',
  },
  es: {
    navCapabilities: 'Capacidades', navHow: 'Cómo funciona', navPricing: 'Precios', signIn: 'Ingresar', create: 'Crear cuenta',
    eyebrow: 'Operaciones para cada sitio que cuidás', title: 'Home Guide',
    hero: 'Organizá propiedades, trabajo de campo y registros de clientes en un solo sistema operativo. Cada tarea queda conectada con su lugar, sus activos y su evidencia.',
    explore: 'Explorar la plataforma', proof: 'Del plano del sitio a la prueba del trabajo',
    audience: 'Creado para el trabajo detrás de cada lugar bien operado',
    audienceBody: 'Administradores de propiedades, equipos de paisajismo, alquiler de plantas, mantenimiento y propietarios comparten una necesidad: saber qué debe hacerse, dónde corresponde y cómo se completó.',
    capabilitiesEyebrow: 'Un registro conectado', capabilitiesTitle: 'Organizar. Ejecutar. Documentar. Compartir.',
    capabilitiesBody: 'Home Guide conecta la oficina, el campo y el cliente sin obligar a todas las operaciones a funcionar de la misma manera.',
    stages: [
      ['Organizar', 'Clientes, sitios, zonas y activos forman una jerarquía clara. Mapas, documentos y etiquetas QR mantienen cada registro unido a un lugar real.'],
      ['Ejecutar', 'Planificá tareas, visitas, rutinas de cuidado y turnos. Cada equipo ve solo el trabajo y las herramientas de su rol.'],
      ['Documentar', 'Foto, hora, ubicación y bitácoras inmutables convierten el trabajo terminado en evidencia operativa.'],
      ['Compartir', 'Portales, manuales, informes, recordatorios y cargos separados convierten el registro de campo en servicio útil.'],
    ],
    realWork: 'Diseñado alrededor de operaciones reales', realWorkBody: 'Elegí solo los módulos que tu equipo necesita hoy. Sumá flujos especializados a medida que la operación crece.',
    features: [
      ['Sitios mapeados', 'Mapas satelitales, zonas, activos GPS e importación KML/KMZ.'],
      ['Tareas y visitas', 'Órdenes espaciales, colas de cuidado, registros y visitas guiadas.'],
      ['Evidencia de campo', 'Foto, QR, hora y ubicación unidos al trabajo completado.'],
      ['Cuidado de plantas', 'Bases por especie y ubicación, riego y reemplazos.'],
      ['Personal y herramientas', 'Turnos, tarifas, asignaciones, inventario y devoluciones.'],
      ['Entrega al cliente', 'Portales privados, manuales PDF, informes, recordatorios y facturas.'],
    ],
    fieldEyebrow: 'Un flujo continuo', fieldTitle: 'El registro acompaña al trabajo',
    fieldBody: 'Empezá con un sitio mapeado. Asigná el trabajo correcto. Capturá evidencia en campo. Dale al cliente una visión clara de lo sucedido.',
    fieldSteps: ['Mapear el sitio', 'Asignar el trabajo', 'Capturar evidencia', 'Compartir el resultado'],
    pricingEyebrow: 'Precios simples y transparentes', pricingTitle: 'Armá la cuenta que tu operación necesita',
    pricingBody: 'Empezá por la cantidad de propiedades o sitios. Sumá módulos especializados solo cuando los necesités.',
    monthly: 'Mensual', annual: 'Anual', annualNote: 'Pagá 10 meses, usá 12', properties: 'Propiedades', perProperty: 'por propiedad / mes',
    extras: 'Módulos opcionales', accountMonth: 'cuenta / mes', summary: 'Tu estimado', dueMonthly: 'por mes', dueAnnual: 'facturado anualmente', saving: 'Ahorrás', continue: 'Crear cuenta y continuar',
    included: 'Incluido en cada cuenta', includedItems: ['Clientes, sitios y activos', 'Tareas, evidencia e informes', 'Interfaz EN, ES y DE', 'Visualización USD y CRC'],
    trustEyebrow: 'Diseñado para trabajo responsable', trustTitle: 'Acceso claro. Registros privados. Historial auditable.',
    trustItems: [
      ['Acceso por rol', 'Dueños, gerentes y cuadrillas ven las herramientas y registros que requiere su trabajo.'],
      ['Evidencia privada', 'Documentos y fotos usan almacenamiento protegido y enlaces de acceso de corta duración.'],
      ['Historial trazable', 'Registros, cierres y bitácoras conservan quién hizo qué y cuándo.'],
    ],
    faqTitle: 'Preguntas antes de empezar', faqs: [
      ['¿Puedo crear una cuenta ahora?', 'Sí. Creá tu cuenta, elegí la configuración y completá el pago con ONVO.'],
      ['¿Qué significa la modalidad anual?', 'Recibís 12 meses de servicio y se cobra el equivalente a 10 meses.'],
      ['¿Puedo pagar en colones?', 'Sí. El pago admite USD y CRC, y el estimado se puede ver en ambas monedas.'],
      ['¿Puedo cambiar la configuración después?', 'Sí. Podés sumar propiedades y módulos opcionales cuando cambie tu operación.'],
    ],
    finalTitle: 'Dale a cada sitio un registro operativo confiable', finalBody: 'Creá tu cuenta, elegí qué administrás y activá Home Guide mediante el pago seguro de ONVO.',
    footer: 'Plataforma operativa para equipos de propiedades, paisajes e instalaciones', secure: 'Pago seguro con ONVO',
  },
  de: {
    navCapabilities: 'Funktionen', navHow: 'Ablauf', navPricing: 'Preise', signIn: 'Anmelden', create: 'Konto erstellen',
    eyebrow: 'Betrieb für jeden betreuten Standort', title: 'Home Guide',
    hero: 'Immobilien, Außeneinsätze und Kundendaten in einem Betriebssystem organisieren. Jede Aufgabe bleibt mit Ort, Anlagen und Nachweisen verbunden.',
    explore: 'Plattform ansehen', proof: 'Vom Standortplan zum Arbeitsnachweis',
    audience: 'Für die Arbeit hinter gut geführten Standorten',
    audienceBody: 'Hausverwaltungen, Gartenteams, Pflanzenvermieter, Facility-Teams und Eigentümer müssen wissen, was wo zu tun ist und wie es abgeschlossen wurde.',
    capabilitiesEyebrow: 'Ein verbundener Datensatz', capabilitiesTitle: 'Organisieren. Ausführen. Dokumentieren. Teilen.',
    capabilitiesBody: 'Home Guide verbindet Büro, Außendienst und Kunden, ohne jeden Betrieb in dieselbe Form zu zwingen.',
    stages: [
      ['Organisieren', 'Kunden, Standorte, Zonen und Anlagen bilden eine klare Hierarchie. Karten, Dokumente und QR-Etiketten halten alles am richtigen Ort.'],
      ['Ausführen', 'Aufgaben, Besuche, Pflegeroutinen und Schichten planen. Teams sehen nur relevante Arbeit und Werkzeuge.'],
      ['Dokumentieren', 'Foto, Zeit, Ort und unveränderliche Protokolle machen erledigte Arbeit belastbar.'],
      ['Teilen', 'Portale, Handbücher, Berichte, Erinnerungen und getrennte Positionen machen Felddaten nutzbar.'],
    ],
    realWork: 'Für reale Abläufe entwickelt', realWorkBody: 'Nur die heute benötigten Module wählen. Spezialabläufe später ergänzen.',
    features: [
      ['Kartierte Standorte', 'Satellitenkarten, Zonen, GPS-Anlagen und KML/KMZ-Import.'],
      ['Aufgaben und Besuche', 'Räumliche Aufträge, Pflegelisten, Check-ins und geführte Besuche.'],
      ['Felddokumentation', 'Foto, QR, Zeit und Ort direkt an erledigter Arbeit.'],
      ['Pflanzenpflege', 'Arten- und Standortwerte, Gießlisten und Ersatz.'],
      ['Personal und Werkzeuge', 'Schichten, Sätze, Zuweisungen, Bestand und Rückgaben.'],
      ['Kundenübergabe', 'Private Portale, PDF-Handbücher, Berichte, Erinnerungen und Rechnungen.'],
    ],
    fieldEyebrow: 'Ein durchgängiger Ablauf', fieldTitle: 'Der Datensatz folgt der Arbeit',
    fieldBody: 'Mit einem kartierten Standort beginnen. Arbeit zuweisen. Nachweise vor Ort erfassen. Kunden das Ergebnis klar zeigen.',
    fieldSteps: ['Standort kartieren', 'Arbeit zuweisen', 'Nachweis erfassen', 'Ergebnis teilen'],
    pricingEyebrow: 'Einfache, klare Preise', pricingTitle: 'Das passende Konto zusammenstellen',
    pricingBody: 'Mit der Anzahl der Standorte beginnen. Spezialmodule nur bei Bedarf ergänzen.',
    monthly: 'Monatlich', annual: 'Jährlich', annualNote: '10 Monate zahlen, 12 nutzen', properties: 'Immobilien', perProperty: 'pro Immobilie / Monat',
    extras: 'Optionale Module', accountMonth: 'Konto / Monat', summary: 'Ihre Schätzung', dueMonthly: 'pro Monat', dueAnnual: 'jährlich berechnet', saving: 'Sie sparen', continue: 'Konto erstellen und fortfahren',
    included: 'In jedem Konto enthalten', includedItems: ['Kunden, Standorte und Anlagen', 'Aufgaben, Nachweise und Berichte', 'Oberfläche EN, ES und DE', 'Anzeige in USD und CRC'],
    trustEyebrow: 'Für verantwortliche Arbeit', trustTitle: 'Klarer Zugriff. Private Daten. Prüffähige Historie.',
    trustItems: [
      ['Rollenbasierter Zugriff', 'Eigentümer, Manager und Teams sehen die passenden Werkzeuge und Daten.'],
      ['Private Nachweise', 'Dokumente und Fotos liegen geschützt hinter kurzlebigen Zugriffslinks.'],
      ['Nachvollziehbare Historie', 'Check-ins, Abschlüsse und Pflegeprotokolle halten fest, wer was wann getan hat.'],
    ],
    faqTitle: 'Fragen vor dem Start', faqs: [
      ['Kann ich jetzt ein Konto erstellen?', 'Ja. Konto erstellen, Konfiguration wählen und mit ONVO bezahlen.'],
      ['Was bedeutet jährliche Abrechnung?', 'Sie erhalten 12 Monate Service und bezahlen den Gegenwert von 10 Monaten.'],
      ['Kann ich in Colones bezahlen?', 'Ja. Checkout unterstützt USD und CRC; die Schätzung ist in beiden Währungen sichtbar.'],
      ['Kann ich später etwas ändern?', 'Ja. Standorte und optionale Module können später ergänzt werden.'],
    ],
    finalTitle: 'Jeder Standort verdient einen verlässlichen Betriebsnachweis', finalBody: 'Konto erstellen, Umfang wählen und Home Guide über den sicheren ONVO-Checkout aktivieren.',
    footer: 'Betriebsplattform für Immobilien-, Garten- und Facility-Teams', secure: 'Sichere Zahlung mit ONVO',
  },
} as const;

const stageIcons = [Building2, ClipboardCheck, Camera, FileText];
const featureIcons = [MapPinned, Clock3, QrCode, Leaf, PackageCheck, BookOpen];
const trustIcons = [Users, Lock, ShieldCheck];
type Currency = 'USD' | 'CRC';

export default function Features() {
  const { language } = useLanguage();
  const c = copy[language === 'es' ? 'es' : language === 'de' ? 'de' : 'en'];
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [propertyCount, setPropertyCount] = useState(1);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const estimate = useMemo(() => quote({ interval, propertyCount, addonIds }), [interval, propertyCount, addonIds]);
  const local = <T extends { en: string; es: string; de: string }>(value: T) => value[language === 'es' ? 'es' : language === 'de' ? 'de' : 'en'];
  const money = (usd: number) => currency === 'CRC'
    ? `₡${Math.round(usd * CRC_PER_USD).toLocaleString('es-CR')}`
    : `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const toggleAddon = (id: string) => setAddonIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <Seo title="Home Guide | Property operations, documented" description={c.hero} path="/" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Home Guide">
            <img src="/images/hg-logo.png" alt="" className="h-9 w-9 object-contain" />
            <span className="font-display text-base font-semibold">Home Guide</span>
          </Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            <a className="story-link text-sm text-muted-foreground hover:text-foreground" href="#capabilities">{c.navCapabilities}</a>
            <a className="story-link text-sm text-muted-foreground hover:text-foreground" href="#workflow">{c.navHow}</a>
            <a className="story-link text-sm text-muted-foreground hover:text-foreground" href="#pricing">{c.navPricing}</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguagePicker />
            <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label={c.signIn}><Link to="/auth"><LogIn /></Link></Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth">{c.signIn}</Link></Button>
            <Button asChild size="sm"><Link to="/auth?mode=signup">{c.create}</Link></Button>
          </div>
        </div>
      </header>

      <section className="relative min-h-[660px] pt-16 lg:min-h-[760px]">
        <img src="/images/estate_guide_4.jpg" alt={c.proof} width={1920} height={1080} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-foreground/60" />
        <div className="relative mx-auto flex min-h-[644px] max-w-7xl items-end px-4 pb-12 pt-24 sm:px-6 md:pb-20 lg:min-h-[744px]">
          <div className="max-w-3xl animate-rise-in text-primary-foreground motion-reduce:animate-none">
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">{c.eyebrow}</p>
            <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">{c.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-primary-foreground/90 md:text-lg">{c.hero}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90"><Link to="/auth?mode=signup">{c.create}<ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><a href="#capabilities">{c.explore}</a></Button>
            </div>
          </div>
          <div className="absolute bottom-8 right-6 hidden items-center gap-3 text-primary-foreground/80 lg:flex">
            <span className="h-px w-16 bg-primary-foreground/50" /><span className="text-xs uppercase tracking-widest">{c.proof}</span>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-secondary/50">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.4fr] md:py-16">
          <h2 className="max-w-xl font-display text-2xl font-semibold leading-tight md:text-3xl">{c.audience}</h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{c.audienceBody}</p>
        </div>
      </section>

      <section id="capabilities" className="scroll-mt-16 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 border-b border-border pb-12 md:grid-cols-[.75fr_1.25fr]">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">{c.capabilitiesEyebrow}</p>
            <div><h2 className="font-display text-3xl font-semibold leading-tight md:text-4xl">{c.capabilitiesTitle}</h2><p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{c.capabilitiesBody}</p></div>
          </div>
          <div className="grid md:grid-cols-2">
            {c.stages.map(([title, description], index) => {
              const Icon = stageIcons[index];
              return <article key={title} className="group border-b border-border py-9 md:px-8 md:first:pl-0 md:[&:nth-child(odd)]:border-r">
                <div className="mb-8 flex items-center justify-between"><span className="font-display text-sm text-muted-foreground">0{index + 1}</span><Icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transform-none" /></div>
                <h3 className="font-display text-xl font-semibold">{title}</h3><p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{description}</p>
              </article>;
            })}
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
          <div className="grid gap-8 md:grid-cols-2"><h2 className="font-display text-3xl font-semibold leading-tight md:text-4xl">{c.realWork}</h2><p className="max-w-xl leading-relaxed text-primary-foreground/80">{c.realWorkBody}</p></div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-md border border-primary-foreground/20 bg-primary-foreground/20 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.map(([title, description], index) => { const Icon = featureIcons[index]; return <article key={title} className="group bg-primary p-6 transition-colors hover:bg-primary-foreground/5"><Icon className="mb-8 h-5 w-5 text-accent transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none" /><h3 className="text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-primary-foreground/70">{description}</p></article>; })}
          </div>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-16 py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">{c.fieldEyebrow}</p><h2 className="mt-4 font-display text-3xl font-semibold leading-tight md:text-4xl">{c.fieldTitle}</h2><p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">{c.fieldBody}</p>
            <ol className="mt-9 space-y-0">{c.fieldSteps.map((step, index) => <li key={step} className="flex items-center gap-4 border-t border-border py-4"><span className="font-display text-xs text-primary">0{index + 1}</span><span className="font-medium">{step}</span>{index < 3 && <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />}</li>)}</ol>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-md"><img src="/images/estate_guide_3.jpg" alt={c.fieldTitle} width={1200} height={900} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02] motion-reduce:transform-none" /><div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-md bg-background/90 p-4 backdrop-blur"><span className="text-sm font-medium">{c.proof}</span><Check className="h-5 w-5 text-primary" /></div></div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 border-y border-border bg-secondary/40 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr]"><p className="text-xs font-semibold uppercase tracking-widest text-primary">{c.pricingEyebrow}</p><div><h2 className="font-display text-3xl font-semibold leading-tight md:text-4xl">{c.pricingTitle}</h2><p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{c.pricingBody}</p></div></div>
          <div className="mt-12 grid overflow-hidden rounded-md border border-border bg-card lg:grid-cols-[1.25fr_.75fr]">
            <div className="border-b border-border p-5 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-md border border-border bg-muted p-1"><Button size="sm" variant={interval === 'monthly' ? 'default' : 'ghost'} onClick={() => setInterval('monthly')}>{c.monthly}</Button><Button size="sm" variant={interval === 'annual' ? 'default' : 'ghost'} onClick={() => setInterval('annual')}>{c.annual}</Button></div>
                <div className="flex rounded-md border border-border p-1"><Button size="sm" variant={currency === 'USD' ? 'secondary' : 'ghost'} onClick={() => setCurrency('USD')}>USD</Button><Button size="sm" variant={currency === 'CRC' ? 'secondary' : 'ghost'} onClick={() => setCurrency('CRC')}>CRC</Button></div>
              </div>
              <div className="mt-8 flex items-center justify-between border-y border-border py-6"><div><p className="font-semibold">{c.properties}</p><p className="mt-1 text-sm text-muted-foreground">{money(BASE_PRICE_PER_PROPERTY_USD)} {c.perProperty}</p></div><div className="flex items-center gap-3"><Button variant="outline" size="icon" aria-label="Decrease" onClick={() => setPropertyCount((value) => Math.max(1, value - 1))}><Minus /></Button><span className="w-8 text-center font-display text-xl font-semibold tabular-nums">{propertyCount}</span><Button variant="outline" size="icon" aria-label="Increase" onClick={() => setPropertyCount((value) => Math.min(500, value + 1))}><Plus /></Button></div></div>
              <div className="pt-6"><p className="mb-4 text-sm font-semibold">{c.extras}</p><div className="grid gap-3 sm:grid-cols-2">{ADDONS.map((addon) => { const selected = addonIds.includes(addon.id); return <Button key={addon.id} type="button" variant="outline" aria-pressed={selected} onClick={() => toggleAddon(addon.id)} className={`h-auto min-h-20 justify-between whitespace-normal p-4 text-left ${selected ? 'border-primary bg-primary/5' : ''}`}><span><span className="block font-semibold">{local(addon.name)}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">+{money(addon.monthlyUsd)} / {c.accountMonth}</span></span><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{selected && <Check className="h-3 w-3" />}</span></Button>; })}</div></div>
            </div>
            <aside className="flex flex-col justify-between p-6 sm:p-8"><div><p className="text-sm font-semibold text-muted-foreground">{c.summary}</p><div className="mt-5 flex items-end gap-2"><span className="font-display text-4xl font-semibold tabular-nums md:text-5xl">{money(estimate.totalUsd)}</span><span className="pb-1 text-sm text-muted-foreground">{interval === 'annual' ? c.dueAnnual : c.dueMonthly}</span></div>{interval === 'annual' && <p className="mt-3 text-sm font-medium text-primary">{c.annualNote}. {c.saving}: {money(estimate.savingUsd)}</p>}
                <div className="mt-8 border-t border-border pt-6"><p className="text-sm font-semibold">{c.included}</p><ul className="mt-4 space-y-3">{c.includedItems.map((item) => <li key={item} className="flex gap-3 text-sm text-muted-foreground"><Check className="h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul></div></div>
              <Button asChild size="lg" className="mt-8 w-full"><Link to="/auth?mode=signup">{c.continue}<ArrowRight /></Link></Button>
            </aside>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28"><div className="mx-auto max-w-7xl px-4 sm:px-6"><p className="text-xs font-semibold uppercase tracking-widest text-primary">{c.trustEyebrow}</p><h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-tight md:text-4xl">{c.trustTitle}</h2><div className="mt-12 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3">{c.trustItems.map(([title, body], index) => { const Icon = trustIcons[index]; return <article key={title} className="bg-card p-7"><Icon className="mb-10 h-5 w-5 text-primary" /><h3 className="text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></article>; })}</div></div></section>

      <section className="border-y border-border bg-card py-20"><div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-[.7fr_1.3fr]"><h2 className="font-display text-2xl font-semibold md:text-3xl">{c.faqTitle}</h2><div className="divide-y divide-border border-y border-border">{c.faqs.map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{question}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><p className="max-w-2xl pt-3 text-sm leading-6 text-muted-foreground">{answer}</p></details>)}</div></div></section>

      <section className="bg-primary text-primary-foreground"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-end md:py-20"><div><h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight md:text-4xl">{c.finalTitle}</h2><p className="mt-4 max-w-xl text-primary-foreground/75">{c.finalBody}</p></div><Button asChild size="lg" className="shrink-0 bg-background text-foreground hover:bg-background/90"><Link to="/auth?mode=signup">{c.create}<ArrowRight /></Link></Button></div></section>

      <footer className="bg-background"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-2"><img src="/images/hg-logo.png" alt="" className="h-7 w-7 object-contain" /><span className="font-display text-sm font-semibold">Home Guide</span></div><p className="text-xs text-muted-foreground">{c.footer}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />{c.secure}</div></div></footer>
    </main>
  );
}
