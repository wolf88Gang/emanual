import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguagePicker } from '@/components/LanguagePicker';
import {
  Leaf, Map, Box, ClipboardList, FolderOpen, Package, Mountain, BookOpen,
  DollarSign, Users, Clock, Shield, BarChart3, Building2, Share2, Droplets,
  Camera, QrCode, Bell, Globe, ArrowRight, Lock, Database, Eye, Receipt, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Seo } from '@/components/Seo';

type L3 = { en: string; es: string; de: string };

interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  title: L3;
  description: L3;
}

interface FeatureSection {
  key: string;
  label: L3;
  intro: L3;
  image: string;
  features: FeatureItem[];
}

const sections: FeatureSection[] = [
  {
    key: 'structure',
    label: {
      en: 'Clients, sites and assets',
      es: 'Clientes, sitios y activos',
      de: 'Kunden, Standorte und Anlagen',
    },
    intro: {
      en: 'Home Guide is built around one hierarchy: your organization, the clients you serve, the sites you look after, and every asset inside them. Nothing lives without a place.',
      es: 'Home Guide se construye sobre una jerarquía: su organización, los clientes que atiende, los sitios que cuida y cada activo dentro de ellos. Nada existe sin un lugar.',
      de: 'Home Guide basiert auf einer Hierarchie: Ihre Organisation, Ihre Kunden, die betreuten Standorte und jede Anlage darin. Nichts existiert ohne Ort.',
    },
    image: '/images/estate_guide_1.jpg',
    features: [
      {
        icon: Building2,
        title: { en: 'Client workspace', es: 'Espacio de clientes', de: 'Kunden-Arbeitsbereich' },
        description: {
          en: 'Each client has its own record with contacts, sites, service plan, care history and communications — so an owner, a villa manager or a shopping centre is never mixed up with another.',
          es: 'Cada cliente tiene su propio registro con contactos, sitios, plan de servicio, historial de cuidado y comunicaciones — para que un propietario, una administradora de villas o un centro comercial nunca se mezclen.',
          de: 'Jeder Kunde hat einen eigenen Datensatz mit Kontakten, Standorten, Serviceplan, Pflegehistorie und Kommunikation — nichts wird vermischt.',
        },
      },
      {
        icon: Map,
        title: { en: 'Spatial site map', es: 'Mapa del sitio', de: 'Standortkarte' },
        description: {
          en: 'Satellite map with drawn zones, GPS-placed asset pins, clustering and KML/KMZ import. Every task and every photo is tied to a real location.',
          es: 'Mapa satelital con zonas dibujadas, activos ubicados por GPS, agrupación e importación KML/KMZ. Cada tarea y cada foto queda ligada a una ubicación real.',
          de: 'Satellitenkarte mit gezeichneten Zonen, GPS-Pins, Clustering und KML/KMZ-Import. Jede Aufgabe und jedes Foto ist verortet.',
        },
      },
      {
        icon: Box,
        title: { en: 'Asset registry', es: 'Registro de activos', de: 'Anlagenregister' },
        description: {
          en: 'Plants, irrigation, hardscape and equipment with photos, install dates, condition, risk flags and full service history. QR labels link the physical asset to its record.',
          es: 'Plantas, riego, obra dura y equipos con fotos, fechas de instalación, condición, banderas de riesgo e historial completo. Las etiquetas QR conectan el activo físico con su ficha.',
          de: 'Pflanzen, Bewässerung, Hardscape und Geräte mit Fotos, Einbaudaten, Zustand, Risikomarkierungen und Historie. QR-Etiketten verbinden Objekt und Datensatz.',
        },
      },
      {
        icon: FolderOpen,
        title: { en: 'Document vault', es: 'Bóveda de documentos', de: 'Dokumentenablage' },
        description: {
          en: 'Warranties, contracts, plans and insurance stored per site or asset, with expiry dates you can actually see coming.',
          es: 'Garantías, contratos, planos y seguros guardados por sitio o activo, con vencimientos que sí se ven venir.',
          de: 'Garantien, Verträge, Pläne und Versicherungen pro Standort oder Anlage, mit sichtbaren Ablaufdaten.',
        },
      },
    ],
  },
  {
    key: 'care',
    label: {
      en: 'Care that is documented, not guessed',
      es: 'Cuidado documentado, no adivinado',
      de: 'Pflege dokumentiert, nicht geraten',
    },
    intro: {
      en: 'Care instructions follow a strict precedence: a documented override wins, then the placement baseline, then the species baseline. When none exists, Home Guide says "needs review" instead of inventing a number.',
      es: 'Las instrucciones de cuidado siguen una precedencia estricta: manda la excepción documentada, luego la línea base de la ubicación, luego la de la especie. Si no existe ninguna, Home Guide indica «revisar» en vez de inventar un número.',
      de: 'Pflegeangaben folgen einer festen Rangfolge: dokumentierte Ausnahme, dann Standort-Basis, dann Arten-Basis. Fehlt alles, zeigt Home Guide „prüfen" statt eine erfundene Zahl.',
    },
    image: '/images/estate_guide_5.jpg',
    features: [
      {
        icon: Leaf,
        title: { en: 'Species and placement baselines', es: 'Líneas base por especie y ubicación', de: 'Basiswerte je Art und Standort' },
        description: {
          en: 'A botanical library with scientific names, light, watering and substrate needs, combined with the real conditions of the pot and the spot where the plant actually stands.',
          es: 'Biblioteca botánica con nombres científicos, luz, riego y sustrato, combinada con las condiciones reales de la maceta y del punto donde la planta está colocada.',
          de: 'Botanische Bibliothek mit Namen, Licht-, Wasser- und Substratbedarf, kombiniert mit den realen Bedingungen von Topf und Standort.',
        },
      },
      {
        icon: Droplets,
        title: { en: 'Watering queue and reminders', es: 'Cola de riego y recordatorios', de: 'Gieß-Warteschlange und Erinnerungen' },
        description: {
          en: 'The care engine calculates what is due today, this week or overdue. Reminders are opt-in per plant, so a client only hears about what they asked to be reminded of.',
          es: 'El motor de cuidado calcula qué toca hoy, esta semana o está vencido. Los recordatorios se activan planta por planta, así el cliente solo recibe lo que pidió.',
          de: 'Die Pflege-Engine berechnet Fälligkeiten für heute, diese Woche oder überfällig. Erinnerungen sind pro Pflanze aktivierbar.',
        },
      },
      {
        icon: ClipboardList,
        title: { en: 'Guided visits', es: 'Visitas guiadas', de: 'Geführte Besuche' },
        description: {
          en: 'A technician opens a visit, sees the canonical care queue for that site, records what was actually done, and cannot close the visit with tools still unreturned.',
          es: 'El técnico abre una visita, ve la cola de cuidado del sitio, registra lo que realmente hizo y no puede cerrarla con herramientas pendientes de devolver.',
          de: 'Techniker öffnen einen Besuch, sehen die Pflegeliste des Standorts, erfassen das Erledigte und können nicht mit offenen Werkzeugen abschließen.',
        },
      },
      {
        icon: Bell,
        title: { en: 'Weather-triggered work', es: 'Trabajo activado por clima', de: 'Wetterausgelöste Aufgaben' },
        description: {
          en: 'Define thresholds for wind, rain, heat or cold. When they are crossed, tasks and alerts are created for the affected sites.',
          es: 'Defina umbrales de viento, lluvia, calor o frío. Al superarse, se crean tareas y alertas para los sitios afectados.',
          de: 'Schwellen für Wind, Regen, Hitze oder Kälte definieren — bei Überschreitung entstehen Aufgaben und Warnungen.',
        },
      },
      {
        icon: Mountain,
        title: { en: 'Terrain and risk', es: 'Terreno y riesgo', de: 'Gelände und Risiko' },
        description: {
          en: 'Import topographic data, draw elevation transects and read slope and drainage before planting or building in the wrong place.',
          es: 'Importe datos topográficos, trace transectos de elevación y lea pendiente y drenaje antes de sembrar o construir en el lugar equivocado.',
          de: 'Topografiedaten importieren, Höhenprofile zeichnen sowie Hang und Entwässerung prüfen.',
        },
      },
    ],
  },
  {
    key: 'operations',
    label: {
      en: 'Field operations with evidence',
      es: 'Operación de campo con evidencia',
      de: 'Feldbetrieb mit Nachweis',
    },
    intro: {
      en: 'Work is only "done" when there is proof: who, where, when, and a photo. Logs are immutable, so a completed visit can still be defended months later.',
      es: 'El trabajo solo está «hecho» cuando hay prueba: quién, dónde, cuándo y una foto. Los registros son inmutables, así una visita se puede sustentar meses después.',
      de: 'Arbeit gilt erst als erledigt, wenn es einen Nachweis gibt: wer, wo, wann und ein Foto. Protokolle sind unveränderlich.',
    },
    image: '/images/estate_guide_3.jpg',
    features: [
      {
        icon: Clock,
        title: { en: 'Shifts by QR and GPS', es: 'Turnos por QR y GPS', de: 'Schichten per QR und GPS' },
        description: {
          en: 'Crews clock in and out by scanning a code on site. Hours, location and notes are recorded for the weekly review.',
          es: 'Las cuadrillas marcan entrada y salida escaneando un código en el sitio. Horas, ubicación y notas quedan registradas para la revisión semanal.',
          de: 'Teams stempeln per Code vor Ort ein und aus. Stunden, Ort und Notizen werden erfasst.',
        },
      },
      {
        icon: Camera,
        title: { en: 'Photo and GPS evidence', es: 'Evidencia con foto y GPS', de: 'Foto- und GPS-Nachweis' },
        description: {
          en: 'Check-ins and task completions require geotagged, timestamped photos — the backbone of duty-of-care reporting.',
          es: 'Los registros y las tareas completadas requieren fotos geoetiquetadas y con hora — la base del informe de deber de cuidado.',
          de: 'Check-ins und Abschlüsse erfordern verortete Fotos mit Zeitstempel — Grundlage der Sorgfaltsnachweise.',
        },
      },
      {
        icon: Package,
        title: { en: 'Tool inventory with returns', es: 'Inventario con devoluciones', de: 'Werkzeugbestand mit Rückgabe' },
        description: {
          en: 'Organization-wide stock: what is available, what is assigned and what came back. Partial returns are supported and over-assignment is rejected.',
          es: 'Inventario de toda la organización: qué hay disponible, qué está asignado y qué regresó. Se admiten devoluciones parciales y se rechaza la sobreasignación.',
          de: 'Organisationsweiter Bestand: verfügbar, zugewiesen, zurückgegeben. Teilrückgaben möglich, Überzuweisung wird abgelehnt.',
        },
      },
      {
        icon: DollarSign,
        title: { en: 'Labor and rates', es: 'Mano de obra y tarifas', de: 'Arbeit und Sätze' },
        description: {
          en: 'Weekly shift summaries, configurable rates per worker and payment tracking in USD or colones.',
          es: 'Resúmenes semanales, tarifas configurables por trabajador y seguimiento de pagos en dólares o colones.',
          de: 'Wochenübersichten, konfigurierbare Sätze je Mitarbeiter und Zahlungsverfolgung in USD oder Colones.',
        },
      },
      {
        icon: QrCode,
        title: { en: 'Scan-to-act labels', es: 'Etiquetas para escanear', de: 'Scan-Etiketten' },
        description: {
          en: 'Print QR labels for assets and sites. Scanning opens the record, starts a shift or logs a check-in — no menu hunting in the field.',
          es: 'Imprima etiquetas QR para activos y sitios. Escanear abre la ficha, inicia un turno o registra una visita — sin buscar menús en el campo.',
          de: 'QR-Etiketten drucken: Scannen öffnet den Datensatz, startet eine Schicht oder erfasst einen Check-in.',
        },
      },
    ],
  },
  {
    key: 'client',
    label: {
      en: 'What the client actually receives',
      es: 'Lo que el cliente realmente recibe',
      de: 'Was der Kunde erhält',
    },
    intro: {
      en: 'Reporting is not an afterthought. Owners and administrators get a portal, a manual and documents they can read without a login and without training.',
      es: 'El reporte no es un extra. Propietarios y administradores reciben un portal, un manual y documentos que pueden leer sin iniciar sesión y sin capacitación.',
      de: 'Berichte sind kein Nachgedanke. Eigentümer erhalten Portal, Handbuch und Dokumente — ohne Login und ohne Schulung.',
    },
    image: '/images/estate_guide_4.jpg',
    features: [
      {
        icon: Share2,
        title: { en: 'Client portal by link', es: 'Portal de cliente por enlace', de: 'Kundenportal per Link' },
        description: {
          en: 'A private link shows the client their sites, care status and recent visits. No account, no password. Links can be rotated or revoked at any time.',
          es: 'Un enlace privado muestra al cliente sus sitios, el estado de cuidado y las visitas recientes. Sin cuenta ni contraseña. Los enlaces se pueden rotar o revocar cuando quiera.',
          de: 'Ein privater Link zeigt Standorte, Pflegestatus und Besuche. Kein Konto, kein Passwort. Links jederzeit erneuerbar oder widerrufbar.',
        },
      },
      {
        icon: BookOpen,
        title: { en: 'Property manual', es: 'Manual de la propiedad', de: 'Objekthandbuch' },
        description: {
          en: 'A PDF manual generated from verified data — zones, assets, care routines and responsibilities — approved by you before it is shared.',
          es: 'Un manual PDF generado a partir de datos verificados — zonas, activos, rutinas y responsabilidades — aprobado por usted antes de compartirse.',
          de: 'Ein PDF-Handbuch aus geprüften Daten — Zonen, Anlagen, Routinen und Zuständigkeiten — vor dem Teilen freigegeben.',
        },
      },
      {
        icon: Receipt,
        title: { en: 'Charges and billing', es: 'Cargos y facturación', de: 'Positionen und Abrechnung' },
        description: {
          en: 'Bill separately for what you separately deliver: supplies, replacements, extra visits, maintenance. Totals are grouped per currency so USD and colones never blur together.',
          es: 'Facture por separado lo que entrega por separado: insumos, reemplazos, visitas extra, mantenimiento. Los totales se agrupan por moneda, sin mezclar dólares y colones.',
          de: 'Getrennt abrechnen, was getrennt geliefert wird: Material, Ersatz, Zusatzbesuche, Wartung. Summen je Währung getrennt.',
        },
      },
      {
        icon: BarChart3,
        title: { en: 'Duty-of-care reports', es: 'Informes de cumplimiento', de: 'Sorgfaltsberichte' },
        description: {
          en: 'Date-range PDF reports with completed tasks, check-ins and photo evidence — the document you send when someone asks what was done.',
          es: 'Informes PDF por rango de fechas con tareas, registros y evidencia fotográfica — el documento que envía cuando le preguntan qué se hizo.',
          de: 'PDF-Berichte nach Zeitraum mit Aufgaben, Check-ins und Fotonachweis.',
        },
      },
      {
        icon: Bell,
        title: { en: 'Reminders you control', es: 'Recordatorios bajo su control', de: 'Erinnerungen unter Kontrolle' },
        description: {
          en: 'Watering and maintenance reminders are queued for review and sent by email or WhatsApp when you approve them — nothing leaves without your hand.',
          es: 'Los recordatorios de riego y mantenimiento se encolan para revisión y se envían por correo o WhatsApp cuando usted los aprueba — nada sale sin su mano.',
          de: 'Gieß- und Wartungserinnerungen werden zur Prüfung gesammelt und nach Freigabe per E-Mail oder WhatsApp gesendet.',
        },
      },
    ],
  },
  {
    key: 'platform',
    label: {
      en: 'A platform you configure, not fight',
      es: 'Una plataforma que se configura, no se pelea',
      de: 'Eine konfigurierbare Plattform',
    },
    intro: {
      en: 'You turn on only the modules your operation uses. Navigation, dashboard and permissions change with them, so nobody sees a screen that does not belong to their work.',
      es: 'Usted activa solo los módulos que su operación usa. La navegación, el panel y los permisos cambian con ellos, así nadie ve pantallas ajenas a su trabajo.',
      de: 'Sie aktivieren nur die benötigten Module. Navigation, Dashboard und Rechte passen sich an.',
    },
    image: '/images/estate_guide_2.jpg',
    features: [
      {
        icon: SlidersHorizontal,
        title: { en: 'Modules per operation', es: 'Módulos por operación', de: 'Module je Betrieb' },
        description: {
          en: 'Property management, landscaping, plant rental or a single estate — presets enable a sensible set of modules and you adjust from there.',
          es: 'Administración de propiedades, paisajismo, alquiler de plantas o una sola finca — los presets activan un conjunto sensato de módulos y usted ajusta.',
          de: 'Hausverwaltung, Garten, Pflanzenvermietung oder ein Anwesen — Presets aktivieren sinnvolle Module, danach anpassbar.',
        },
      },
      {
        icon: Users,
        title: { en: 'Roles with real limits', es: 'Roles con límites reales', de: 'Rollen mit echten Grenzen' },
        description: {
          en: 'Owner, manager, crew and client each see a different application. Limits are enforced in the database, not only in the interface.',
          es: 'Dueño, gerente, cuadrilla y cliente ven aplicaciones distintas. Los límites se aplican en la base de datos, no solo en la interfaz.',
          de: 'Eigentümer, Manager, Team und Kunde sehen unterschiedliche Anwendungen. Grenzen gelten in der Datenbank.',
        },
      },
      {
        icon: Globe,
        title: { en: 'English, Spanish, German', es: 'Inglés, español, alemán', de: 'Englisch, Spanisch, Deutsch' },
        description: {
          en: 'The whole platform switches language instantly — crews work in Spanish while owners read reports in English or German.',
          es: 'Toda la plataforma cambia de idioma al instante — las cuadrillas trabajan en español mientras los propietarios leen en inglés o alemán.',
          de: 'Die gesamte Plattform wechselt sofort die Sprache.',
        },
      },
      {
        icon: DollarSign,
        title: { en: 'USD and colones', es: 'Dólares y colones', de: 'USD und Colones' },
        description: {
          en: 'Prices, rates and totals can be shown in the currency each client expects, without mixing them in the same total.',
          es: 'Precios, tarifas y totales se muestran en la moneda que cada cliente espera, sin mezclarlas en un mismo total.',
          de: 'Preise und Summen in der jeweils erwarteten Währung, ohne Vermischung.',
        },
      },
      {
        icon: Shield,
        title: { en: 'Works on the phone', es: 'Funciona en el teléfono', de: 'Funktioniert am Telefon' },
        description: {
          en: 'Built mobile-first for iOS and Android, because the work happens outside — on a roof, in a garden, in a shopping centre corridor.',
          es: 'Construida primero para móvil, iOS y Android, porque el trabajo ocurre afuera — en un techo, en un jardín, en el pasillo de un centro comercial.',
          de: 'Mobil-first für iOS und Android, denn die Arbeit passiert draußen.',
        },
      },
      {
        icon: Lock,
        title: { en: 'Invitation-only access', es: 'Acceso solo por invitación', de: 'Zugang nur auf Einladung' },
        description: {
          en: 'Accounts are created by our team after reviewing your operation. There is no open sign-up and no anonymous demo of your data.',
          es: 'Las cuentas las crea nuestro equipo tras revisar su operación. No hay registro abierto ni demo anónima de sus datos.',
          de: 'Konten werden nach Prüfung von unserem Team erstellt. Keine offene Registrierung.',
        },
      },
    ],
  },
];

export default function Features() {
  const { language } = useLanguage();
  const es = language === 'es';
  const l = (v: L3) => (language === 'es' ? v.es : language === 'de' ? v.de : v.en);
  const t3 = (en: string, esT: string, de: string) => l({ en, es: esT, de });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Seo
        title={t3(
          'Home Guide — Property, landscape & plant care operations',
          'Home Guide — Operación de propiedades, paisajes y plantas',
          'Home Guide — Betrieb von Immobilien, Gärten und Pflanzen',
        )}
        description={t3(
          'Manage clients, sites and living assets with mapped locations, documented care, photo evidence, client portals and separate billing. Invitation only.',
          'Gestione clientes, sitios y activos vivos con ubicaciones mapeadas, cuidado documentado, evidencia fotográfica, portales de cliente y facturación separada. Solo por invitación.',
          'Kunden, Standorte und lebende Anlagen verwalten: Karten, dokumentierte Pflege, Fotonachweise, Kundenportale und getrennte Abrechnung. Nur auf Einladung.',
        )}
        path="/"
      />
      {/* Minimal header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50" style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/images/hg-logo.png" alt="HG" className="w-8 h-8 object-contain" />
            <span className="text-base font-display font-semibold text-foreground tracking-tight">Home Guide</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              {t3('Home', 'Inicio', 'Start')}
            </Link>
            <LanguagePicker />
            <Link to="/auth" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              {t3('Sign In', 'Iniciar Sesión', 'Anmelden')}
            </Link>
            <Link to="/request-access">
              <Button size="sm" className="text-xs font-medium tracking-wide uppercase bg-primary text-primary-foreground hover:bg-primary/90">
                {t3('Request Access', 'Solicitar Acceso', 'Zugang anfragen')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] flex items-end overflow-hidden">
        <img
          src="/images/estate_guide_4.jpg"
          alt={t3(
            'Managed estate landscape at dusk',
            'Paisaje de una propiedad gestionada al atardecer',
            'Gepflegte Anlage in der Dämmerung',
          )}
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-16 w-full">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-white/80 mb-4">
            {t3('Operations platform', 'Plataforma operativa', 'Betriebsplattform')}
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white leading-[1.05] max-w-4xl">
            {t3(
              'Every property, every plant, every visit — accounted for',
              'Cada propiedad, cada planta, cada visita — con respaldo',
              'Jede Immobilie, jede Pflanze, jeder Besuch — belegt',
            )}
          </h1>
          <p className="mt-6 text-base md:text-lg text-white/90 max-w-2xl leading-relaxed">
            {t3(
              'Home Guide organizes your clients, their sites and the living assets you care for, then proves the work with GPS, photos and immutable logs — and turns it into reports, manuals and invoices your clients understand.',
              'Home Guide organiza sus clientes, sus sitios y los activos vivos que cuida, respalda el trabajo con GPS, fotos y registros inmutables, y lo convierte en informes, manuales y facturas que su cliente entiende.',
              'Home Guide organisiert Kunden, Standorte und lebende Anlagen, belegt die Arbeit mit GPS, Fotos und unveränderlichen Protokollen und erstellt daraus Berichte, Handbücher und Rechnungen.',
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/request-access">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 font-medium tracking-wide px-6"
              >
                {t3('Request access', 'Solicitar acceso', 'Zugang anfragen')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/70">
            {t3(
              'Invitation only — we review each operation before opening an account.',
              'Solo por invitación — revisamos cada operación antes de abrir una cuenta.',
              'Nur auf Einladung — wir prüfen jeden Betrieb vor der Kontoeröffnung.',
            )}
          </p>
        </div>
      </section>

      {/* Who it is for */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground max-w-3xl tracking-tight">
          {t3(
            'Built for the people who answer when something goes wrong',
            'Hecho para quienes responden cuando algo sale mal',
            'Für die, die einstehen, wenn etwas schiefgeht',
          )}
        </h2>
        <p className="mt-4 text-base text-muted-foreground max-w-3xl leading-relaxed">
          {t3(
            'A villa manager billing owners for provisioning, guest check-ins and maintenance. A landscaping company running crews across a dozen gardens. A plant rental business keeping hundreds of pots alive inside shopping centres. An owner who simply wants to know what was done last month.',
            'Una administradora de villas que factura a los dueños por insumos, ingresos de huéspedes y mantenimiento. Una empresa de paisajismo con cuadrillas en una docena de jardines. Un negocio de alquiler de plantas que mantiene vivas cientos de macetas en centros comerciales. Un propietario que solo quiere saber qué se hizo el mes pasado.',
            'Villenverwaltung mit getrennter Abrechnung. Gartenbaufirma mit Teams in vielen Gärten. Pflanzenvermietung in Einkaufszentren. Eigentümer, die wissen wollen, was passiert ist.',
          )}
        </p>
      </section>

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <section key={section.key}>
          {/* Section divider with image */}
          <div className="relative h-64 md:h-80 overflow-hidden">
            <img
              src={section.image}
              alt={l(section.label)}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/55" />
            <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col justify-end h-full pb-10">
              <span className="text-xs font-medium tracking-[0.2em] uppercase text-white/80 mb-3">
                {String(sIdx + 1).padStart(2, '0')} / 05
              </span>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white">
                {l(section.label)}
              </h2>
            </div>
          </div>

          {/* Feature grid */}
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
            <p className="text-base text-muted-foreground max-w-3xl leading-relaxed mb-10">
              {l(section.intro)}
            </p>
            <div className="grid gap-px bg-border rounded-2xl overflow-hidden border border-border">
              {section.features.map((feature, fIdx) => (
                <div
                  key={fIdx}
                  className="bg-card p-8 md:p-10 flex flex-col sm:flex-row gap-6 items-start"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground mb-1.5 tracking-tight">
                      {l(feature.title)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {l(feature.description)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Security & Trust Section */}
      <section className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium tracking-widest uppercase text-primary">
                {t3('Security & Trust', 'Seguridad y Confianza', 'Sicherheit & Vertrauen')}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              {t3('Your clients\u2019 data stays your clients\u2019 data', 'Los datos de sus clientes siguen siendo suyos', 'Kundendaten bleiben Kundendaten')}
            </h2>
            <p className="text-base text-muted-foreground mt-3 max-w-2xl mx-auto">
              {t3(
                'Contracts, tax IDs and property details are sensitive. Access is scoped per organization and enforced at the database level.',
                'Contratos, números fiscales y detalles de propiedades son sensibles. El acceso se limita por organización y se aplica a nivel de base de datos.',
                'Verträge, Steuernummern und Objektdaten sind sensibel. Zugriff ist je Organisation begrenzt und in der Datenbank durchgesetzt.',
              )}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-2xl border border-border bg-background">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {t3('Encrypted in transit and at rest', 'Cifrado en tránsito y en reposo', 'Verschlüsselt bei Übertragung und Speicherung')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t3(
                  'Documents and photos are stored in private buckets reachable only through short-lived, signed links.',
                  'Documentos y fotos se guardan en depósitos privados, accesibles solo mediante enlaces firmados de corta duración.',
                  'Dokumente und Fotos liegen in privaten Buckets, erreichbar nur über kurzlebige signierte Links.',
                )}
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-border bg-background">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {t3('Row-level isolation', 'Aislamiento por fila', 'Zeilenbasierte Trennung')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t3(
                  'Every table is protected by policies tied to your organization and role — one client can never read another.',
                  'Cada tabla está protegida por políticas ligadas a su organización y rol — un cliente nunca puede leer a otro.',
                  'Jede Tabelle ist durch Richtlinien nach Organisation und Rolle geschützt.',
                )}
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-border bg-background">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {t3('Auditable history', 'Historial auditable', 'Nachvollziehbare Historie')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t3(
                  'Check-ins, completions and care logs are append-only, so a record cannot be quietly rewritten after the fact.',
                  'Registros, cierres y bitácoras de cuidado solo se agregan, nunca se reescriben en silencio después.',
                  'Check-ins, Abschlüsse und Pflegeprotokolle sind unveränderlich.',
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/estate_guide_2.jpg"
            alt={t3('Estate at night', 'Propiedad de noche', 'Anwesen bei Nacht')}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
            {t3('Tell us how your operation works', 'Cuéntenos cómo funciona su operación', 'Erzählen Sie uns von Ihrem Betrieb')}
          </h2>
          <p className="text-base text-white/80 max-w-xl mx-auto mb-10">
            {t3(
              'Home Guide is configured around each operation before the first login. Send us a short description and our team will set it up with you.',
              'Home Guide se configura según cada operación antes del primer ingreso. Envíenos una breve descripción y nuestro equipo la prepara con usted.',
              'Home Guide wird vor dem ersten Login je Betrieb konfiguriert. Senden Sie eine kurze Beschreibung, wir richten es mit Ihnen ein.',
            )}
          </p>
          <Link to="/request-access">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-white/90 font-medium tracking-wide px-8"
            >
              {t3('Request access', 'Solicitar acceso', 'Zugang anfragen')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/hg-logo.png" alt="HG" className="w-6 h-6 object-contain" />
            <span className="text-sm font-display font-medium text-foreground">Home Guide</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>{t3('Encrypted storage', 'Almacenamiento cifrado', 'Verschlüsselter Speicher')}</span>
            </div>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>{t3('Invitation only', 'Solo por invitación', 'Nur auf Einladung')}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {es ? 'Gestión digital de propiedades y paisajes' : language === 'de' ? 'Digitale Objekt- und Gartenverwaltung' : 'Digital property & landscape management'}
          </p>
        </div>
      </footer>
    </main>
  );
}
