import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Leaf, Map, Box, ClipboardList, FolderOpen, Package, Mountain, BookOpen,
  DollarSign, Recycle, ShoppingBag, Users, Clock, Shield, Wrench, BarChart3,
  Camera, QrCode, Bell, Zap, Globe, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  titleEs: string;
  description: string;
  descriptionEs: string;
}

interface FeatureSection {
  key: string;
  labelEn: string;
  labelEs: string;
  image: string;
  features: FeatureItem[];
}

const sections: FeatureSection[] = [
  {
    key: 'core',
    labelEn: 'Core Estate Management',
    labelEs: 'Gestión de Propiedad',
    image: '/images/estate_guide_1.jpg',
    features: [
      { icon: Map, title: 'Interactive Estate Map', titleEs: 'Mapa Interactivo', description: 'GIS-lite map with zones, asset pins, KML import, and zone drawing tools to visualize your entire property spatially.', descriptionEs: 'Mapa GIS con zonas, pins de activos, importación KML y herramientas de dibujo para visualizar tu propiedad.' },
      { icon: Box, title: 'Asset Registry', titleEs: 'Registro de Activos', description: 'Catalog every living asset, irrigation system, hardscape, and equipment. Track install dates, service history, and risk flags.', descriptionEs: 'Cataloga cada activo vivo, riego, hardscape y equipo. Rastrea instalación, historial y riesgos.' },
      { icon: ClipboardList, title: 'Smart Tasks', titleEs: 'Tareas Inteligentes', description: 'Recurring tasks with AI-suggested maintenance templates based on your asset profiles and seasonal patterns.', descriptionEs: 'Tareas recurrentes con plantillas de mantenimiento sugeridas por IA basadas en tus activos y estaciones.' },
      { icon: Leaf, title: 'Plant Registry & Protocols', titleEs: 'Registro de Plantas', description: 'Botanical library with scientific names, care templates, native status, and AI-generated care protocols per asset.', descriptionEs: 'Biblioteca botánica con nombres científicos, plantillas de cuidado y protocolos generados por IA.' },
      { icon: FolderOpen, title: 'Document Vault', titleEs: 'Bóveda de Documentos', description: 'Digital binder for warranties, as-builts, contracts, and insurance. Track expiry dates and link to assets or zones.', descriptionEs: 'Carpeta digital para garantías, planos, contratos y seguros. Rastrea vencimientos y vincula a activos.' },
    ],
  },
  {
    key: 'operations',
    labelEn: 'Operations & Workforce',
    labelEs: 'Operaciones y Personal',
    image: '/images/estate_guide_3.jpg',
    features: [
      { icon: Clock, title: 'Worker Check-in & Shifts', titleEs: 'Registro de Turnos', description: 'QR-based clock-in/out with GPS tracking, work logs, shift validations, and per-worker payment tracking.', descriptionEs: 'Entrada/salida por QR con GPS, bitácoras, validaciones de turno y seguimiento de pagos por trabajador.' },
      { icon: DollarSign, title: 'Labor Management', titleEs: 'Gestión Laboral', description: 'Weekly shift summaries, configurable rates, multi-method payments, and AI-powered shift validation.', descriptionEs: 'Resúmenes semanales, tarifas configurables, pagos multi-método y validación de turnos con IA.' },
      { icon: Package, title: 'Tool & Supply Inventory', titleEs: 'Inventario', description: 'Track tools, chemicals, fertilizers, and supplies. Assign to workers, monitor condition, manage returns.', descriptionEs: 'Rastrea herramientas, químicos, fertilizantes. Asigna a trabajadores, monitorea y gestiona devoluciones.' },
      { icon: Camera, title: 'Photo Evidence System', titleEs: 'Evidencia Fotográfica', description: 'Geotagged, timestamped documentation for check-ins, task completions, and duty-of-care reporting.', descriptionEs: 'Documentación geoetiquetada para registros, tareas completadas e informes de deber de cuidado.' },
    ],
  },
  {
    key: 'sustainability',
    labelEn: 'Sustainability & Environment',
    labelEs: 'Sostenibilidad y Medio Ambiente',
    image: '/images/estate_guide_5.jpg',
    features: [
      { icon: Recycle, title: 'Compost Manager', titleEs: 'Gestor de Compost', description: 'Full-cycle tracking from creation to application. Log ingredients, temperature, moisture, and turns.', descriptionEs: 'Seguimiento completo desde creación hasta aplicación. Registra ingredientes, temperatura y humedad.' },
      { icon: Mountain, title: 'Topography & Risk Analysis', titleEs: 'Topografía y Riesgos', description: 'Import topographic data, draw elevation transects, analyze slopes and drainage, map erosion risks.', descriptionEs: 'Importa datos topográficos, traza transectos, analiza pendientes y drenaje, mapea riesgos de erosión.' },
      { icon: Bell, title: 'Weather Alerts & Rules', titleEs: 'Alertas Climáticas', description: 'Define threshold rules for freeze, rain, wind, or drought. System auto-creates tasks and alerts your team.', descriptionEs: 'Define umbrales para helada, lluvia, viento o sequía. El sistema crea tareas y alerta al equipo.' },
    ],
  },
  {
    key: 'business',
    labelEn: 'Business & Reporting',
    labelEs: 'Negocios y Reportes',
    image: '/images/estate_guide_4.jpg',
    features: [
      { icon: ShoppingBag, title: 'CRM & Sales Suite', titleEs: 'CRM y Ventas', description: 'Client directory, product/service catalog, invoice generation, payment tracking, and revenue history.', descriptionEs: 'Directorio, catálogo, facturación, seguimiento de pagos e historial de ingresos.' },
      { icon: BookOpen, title: 'AI Estate Manual', titleEs: 'Manual con IA', description: 'AI generates a comprehensive property manual from verified data: zones, assets, history, and routines.', descriptionEs: 'La IA genera un manual integral desde datos verificados: zonas, activos, historial y rutinas.' },
      { icon: BarChart3, title: 'Duty of Care Reports', titleEs: 'Informes de Cumplimiento', description: 'Generate date-range PDF reports with completed tasks, field check-ins, and photo evidence.', descriptionEs: 'Genera informes PDF por rango de fechas con tareas, registros y evidencia fotográfica.' },
    ],
  },
  {
    key: 'platform',
    labelEn: 'Platform & Intelligence',
    labelEs: 'Plataforma e Inteligencia',
    image: '/images/estate_guide_2.jpg',
    features: [
      { icon: Users, title: 'Role-based Access Control', titleEs: 'Control de Acceso por Roles', description: 'Owner, Manager, Crew, Vendor — each role sees precisely what they need, nothing more.', descriptionEs: 'Dueño, Gerente, Equipo, Proveedor — cada rol ve exactamente lo que necesita.' },
      { icon: QrCode, title: 'QR Code System', titleEs: 'Sistema QR', description: 'Generate and print labels for any asset. Scan to view details, start shifts, or log check-ins.', descriptionEs: 'Genera e imprime etiquetas para activos. Escanea para detalles, turnos o registros.' },
      { icon: Globe, title: 'Bilingual Interface', titleEs: 'Interfaz Bilingüe', description: 'Full English and Spanish support across the entire platform. Switch languages instantly.', descriptionEs: 'Soporte completo en inglés y español en toda la plataforma. Cambia al instante.' },
      { icon: Zap, title: 'AI-Powered Intelligence', titleEs: 'Inteligencia Artificial', description: 'AI suggests tasks, generates care protocols, validates worker shifts, and produces property manuals.', descriptionEs: 'La IA sugiere tareas, genera protocolos, valida turnos y produce manuales de propiedad.' },
      { icon: Shield, title: 'Subscription Management', titleEs: 'Gestión de Suscripción', description: 'Monthly or annual plans via PayPal with secure processing and automatic subscription management.', descriptionEs: 'Planes mensuales o anuales por PayPal con procesamiento seguro y gestión automática.' },
    ],
  },
];

export default function Features() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const es = language === 'es';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-serif font-semibold text-foreground tracking-tight">Casa Guide</span>
          </Link>
          <Link to="/auth">
            <Button size="sm" variant="outline" className="text-xs font-medium tracking-wide uppercase">
              {es ? 'Comenzar' : 'Get Started'}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] flex items-end overflow-hidden">
        <img
          src="/images/estate_guide_4.jpg"
          alt="Estate landscape"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-16 w-full">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-white/50 mb-4">
            {es ? 'Plataforma' : 'Platform Overview'}
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white leading-[1.05] max-w-4xl">
            {es
              ? 'Gestión de propiedades con precisión y propósito'
              : 'Property management with precision and purpose'}
          </h1>
          <p className="mt-6 text-base md:text-lg text-white/60 max-w-2xl leading-relaxed">
            {es
              ? '19 módulos integrados para propiedades que exigen excelencia operativa y cuidado a largo plazo.'
              : '19 integrated modules for properties that demand operational excellence and long-term stewardship.'}
          </p>
        </div>
      </section>

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <section key={section.key}>
          {/* Section divider with image */}
          <div className="relative h-64 md:h-80 overflow-hidden">
            <img
              src={section.image}
              alt={es ? section.labelEs : section.labelEn}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/55" />
            <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col justify-end h-full pb-10">
              <span className="text-xs font-medium tracking-[0.2em] uppercase text-white/40 mb-3">
                {String(sIdx + 1).padStart(2, '0')} / 05
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">
                {es ? section.labelEs : section.labelEn}
              </h2>
            </div>
          </div>

          {/* Feature grid */}
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
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
                      {es ? feature.titleEs : feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {es ? feature.descriptionEs : feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/estate_guide_2.jpg"
            alt="Estate at night"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4">
            {es ? 'Tu propiedad merece más' : 'Your property deserves more'}
          </h2>
          <p className="text-base text-white/50 max-w-lg mx-auto mb-10">
            {es
              ? 'Configura tu primera propiedad en minutos. Sin compromiso.'
              : 'Set up your first property in minutes. No commitment required.'}
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-white text-foreground hover:bg-white/90 font-medium tracking-wide px-8"
          >
            {es ? 'Comenzar ahora' : 'Get started'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Leaf className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-serif font-medium text-foreground">Casa Guide</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {es ? 'Gestión digital de propiedades y paisajes' : 'Digital property & landscape management'}
          </p>
        </div>
      </footer>
    </div>
  );
}
