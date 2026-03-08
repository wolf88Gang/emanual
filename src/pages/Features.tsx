import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Leaf, Map, Box, ClipboardList, FolderOpen, Package, Mountain, BookOpen,
  DollarSign, Recycle, ShoppingBag, Users, Clock, Shield, Wrench, BarChart3,
  Camera, QrCode, Bell, Zap, Globe, ArrowLeft
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
      { icon: Map, title: 'Interactive Estate Map', titleEs: 'Mapa Interactivo', description: 'GIS-lite map with zones, asset pins, KML import, and zone drawing tools.', descriptionEs: 'Mapa GIS con zonas, pins de activos, importación KML y herramientas de dibujo.' },
      { icon: Box, title: 'Asset Registry', titleEs: 'Registro de Activos', description: 'Catalog every living asset, irrigation system, hardscape, and equipment with full history.', descriptionEs: 'Cataloga cada activo vivo, riego, hardscape y equipo con historial completo.' },
      { icon: ClipboardList, title: 'Smart Tasks (Recurring + AI)', titleEs: 'Tareas Inteligentes (IA)', description: 'One-time or recurring tasks. AI analyzes assets and suggests maintenance templates.', descriptionEs: 'Tareas únicas o recurrentes. La IA analiza activos y sugiere plantillas de mantenimiento.' },
      { icon: Leaf, title: 'Plant Registry & Care Protocols', titleEs: 'Registro de Plantas', description: 'Botanical library with scientific names, care templates, and AI-generated protocols.', descriptionEs: 'Biblioteca botánica con nombres científicos, plantillas de cuidado y protocolos IA.' },
      { icon: FolderOpen, title: 'Document Vault', titleEs: 'Bóveda de Documentos', description: 'Warranties, as-builts, contracts, insurance. Track expiry dates and link to assets.', descriptionEs: 'Garantías, planos, contratos, seguros. Rastrea vencimientos y vincula a activos.' },
    ],
  },
  {
    key: 'operations',
    labelEn: 'Operations & Workforce',
    labelEs: 'Operaciones y Personal',
    image: '/images/estate_guide_3.jpg',
    features: [
      { icon: Clock, title: 'Worker Check-in & Shifts', titleEs: 'Registro de Turnos', description: 'QR-based clock-in/out with GPS, work logs, and payment tracking per worker.', descriptionEs: 'Entrada/salida QR con GPS, bitácoras y seguimiento de pagos por trabajador.' },
      { icon: DollarSign, title: 'Labor Management', titleEs: 'Gestión Laboral', description: 'Weekly summaries, hourly/daily rates, payments (cash, PayPal, transfer), AI validation.', descriptionEs: 'Resúmenes semanales, tarifas, pagos (efectivo, PayPal, transferencia), validación IA.' },
      { icon: Package, title: 'Tool & Supply Inventory', titleEs: 'Inventario', description: 'Track tools, chemicals, fertilizers. Assign to workers and manage returns.', descriptionEs: 'Rastrea herramientas, químicos, fertilizantes. Asigna y gestiona devoluciones.' },
      { icon: Camera, title: 'Photo Evidence', titleEs: 'Evidencia Fotográfica', description: 'Geotagged, timestamped photos for check-ins, tasks, and duty-of-care reports.', descriptionEs: 'Fotos geoetiquetadas para registros, tareas e informes de deber de cuidado.' },
    ],
  },
  {
    key: 'sustainability',
    labelEn: 'Sustainability & Environment',
    labelEs: 'Sostenibilidad',
    image: '/images/estate_guide_5.jpg',
    features: [
      { icon: Recycle, title: 'Compost Manager', titleEs: 'Gestor de Compost', description: 'Full cycle: creation to application. Log ingredients, temperature, moisture, turns.', descriptionEs: 'Ciclo completo: creación a aplicación. Registra ingredientes, temperatura, humedad.' },
      { icon: Mountain, title: 'Topography & Risk Analysis', titleEs: 'Topografía y Riesgos', description: 'Import topographic data, elevation transects, slope analysis, erosion risk mapping.', descriptionEs: 'Datos topográficos, transectos, análisis de pendientes, mapeo de riesgos de erosión.' },
      { icon: Bell, title: 'Weather Alerts & Rules', titleEs: 'Alertas Climáticas', description: 'Custom rules for freeze, rain, wind, drought. Auto-create tasks on threshold triggers.', descriptionEs: 'Reglas para helada, lluvia, viento, sequía. Crea tareas automáticamente.' },
    ],
  },
  {
    key: 'business',
    labelEn: 'Business & Reporting',
    labelEs: 'Negocios y Reportes',
    image: '/images/estate_guide_4.jpg',
    features: [
      { icon: ShoppingBag, title: 'CRM & Sales Suite', titleEs: 'CRM y Ventas', description: 'Client directory, product catalog, invoicing, payment tracking, and revenue history.', descriptionEs: 'Directorio, catálogo, facturación, seguimiento de pagos e historial de ingresos.' },
      { icon: BookOpen, title: 'AI Estate Manual', titleEs: 'Manual con IA', description: 'AI generates comprehensive property manual from verified system data. Export Markdown.', descriptionEs: 'La IA genera manual integral desde datos del sistema. Exporta Markdown.' },
      { icon: BarChart3, title: 'Duty of Care Reports', titleEs: 'Informes de Cumplimiento', description: 'PDF reports with completed tasks, field check-ins, photo evidence, and compliance docs.', descriptionEs: 'Informes PDF con tareas, registros, evidencia fotográfica y documentación.' },
    ],
  },
  {
    key: 'platform',
    labelEn: 'Platform & Intelligence',
    labelEs: 'Plataforma e Inteligencia',
    image: '/images/estate_guide_2.jpg',
    features: [
      { icon: Users, title: 'Role-based Access', titleEs: 'Acceso por Roles', description: 'Owner, Manager, Crew, Vendor — each sees only what they need.', descriptionEs: 'Dueño, Gerente, Equipo, Proveedor — cada rol ve solo lo necesario.' },
      { icon: QrCode, title: 'QR Code System', titleEs: 'Códigos QR', description: 'Generate labels for assets. Scan to view details, start shifts, or log check-ins.', descriptionEs: 'Genera etiquetas. Escanea para detalles, turnos o registros.' },
      { icon: Globe, title: 'Bilingual (EN/ES)', titleEs: 'Bilingüe', description: 'Full interface in English and Spanish. Switch instantly.', descriptionEs: 'Interfaz completa en inglés y español. Cambia al instante.' },
      { icon: Zap, title: 'AI-Powered Intelligence', titleEs: 'Inteligencia IA', description: 'AI suggests tasks, generates care protocols, validates shifts, produces manuals.', descriptionEs: 'La IA sugiere tareas, genera protocolos, valida turnos, produce manuales.' },
      { icon: Shield, title: 'Subscription & Payments', titleEs: 'Suscripción y Pagos', description: 'Monthly ($19.99) or annual ($199.99) via PayPal with automatic management.', descriptionEs: 'Mensual ($19.99) o anual ($199.99) por PayPal con gestión automática.' },
    ],
  },
];

export default function Features() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const es = language === 'es';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-serif font-semibold text-primary">Casa Guide</span>
            </div>
          </div>
          <Link to="/auth">
            <Button size="sm">{es ? 'Comenzar' : 'Get Started'}</Button>
          </Link>
        </div>
      </header>

      {/* Hero with background image */}
      <section className="relative h-[50vh] min-h-[360px] flex items-center justify-center overflow-hidden">
        <img
          src="/images/estate_guide_4.jpg"
          alt="Estate landscape"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 text-center px-6 max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-4 leading-tight">
            {es ? 'Todo lo que Casa Guide puede hacer' : 'Everything Casa Guide Can Do'}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            {es
              ? 'Plataforma integral para gestionar propiedades, paisajes, equipos, compost, ventas y más.'
              : 'A comprehensive platform to manage properties, landscapes, teams, compost, sales, and more.'}
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      {sections.map((section, sIdx) => {
        const isReversed = sIdx % 2 !== 0;
        return (
          <section key={section.key} className="relative">
            {/* Section hero band */}
            <div className="relative h-48 md:h-64 overflow-hidden">
              <img
                src={section.image}
                alt={es ? section.labelEs : section.labelEn}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative z-10 flex items-center justify-center h-full">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white text-center px-4">
                  {es ? section.labelEs : section.labelEn}
                </h2>
              </div>
            </div>

            {/* Feature cards */}
            <div className="max-w-6xl mx-auto px-4 py-12">
              <div className={`grid gap-6 ${section.features.length <= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                {section.features.map((feature, fIdx) => (
                  <div
                    key={fIdx}
                    className="group p-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-base mb-2">
                      {es ? feature.titleEs : feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {es ? feature.descriptionEs : feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <section className="relative h-72 flex items-center justify-center overflow-hidden">
        <img
          src="/images/estate_guide_2.jpg"
          alt="Estate at night"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center px-6">
          <h2 className="text-3xl font-serif font-bold text-white mb-3">
            {es ? '¿Listo para empezar?' : 'Ready to get started?'}
          </h2>
          <p className="text-white/70 mb-6 max-w-md mx-auto">
            {es
              ? 'Crea tu cuenta y configura tu primera propiedad en minutos.'
              : 'Create your account and set up your first property in minutes.'}
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="bg-white text-black hover:bg-white/90">
            {es ? 'Crear cuenta' : 'Create account'}
          </Button>
        </div>
      </section>
    </div>
  );
}
