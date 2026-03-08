import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Leaf, Map, Box, ClipboardList, FolderOpen, Package, Mountain, BookOpen,
  DollarSign, Recycle, ShoppingBag, Users, Clock, Shield, Wrench, BarChart3,
  Camera, QrCode, Bell, Zap, Globe, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  titleEs: string;
  description: string;
  descriptionEs: string;
  category: string;
}

const features: FeatureItem[] = [
  // Core Estate Management
  {
    icon: Map,
    title: 'Interactive Estate Map',
    titleEs: 'Mapa Interactivo',
    description: 'GIS-lite map with zones, asset pins, KML import, and zone drawing tools. Visualize your entire property spatially.',
    descriptionEs: 'Mapa GIS con zonas, pins de activos, importación KML y herramientas de dibujo. Visualiza toda tu propiedad espacialmente.',
    category: 'core',
  },
  {
    icon: Box,
    title: 'Asset Registry',
    titleEs: 'Registro de Activos',
    description: 'Catalog every living asset, irrigation system, lighting, hardscape, and equipment. Track install dates, service history, risk flags, and critical care notes.',
    descriptionEs: 'Cataloga cada activo vivo, sistema de riego, iluminación, hardscape y equipo. Rastrea fechas de instalación, historial de servicio, riesgos y notas de cuidado crítico.',
    category: 'core',
  },
  {
    icon: ClipboardList,
    title: 'Smart Tasks (Recurring + AI)',
    titleEs: 'Tareas Inteligentes (Recurrentes + IA)',
    description: 'Create one-time or recurring tasks (weekly, monthly, quarterly, annual, seasonal). AI analyzes your assets and suggests maintenance templates automatically.',
    descriptionEs: 'Crea tareas únicas o recurrentes (semanal, mensual, trimestral, anual, estacional). La IA analiza tus activos y sugiere plantillas de mantenimiento automáticamente.',
    category: 'core',
  },
  {
    icon: Leaf,
    title: 'Plant Registry & Care Protocols',
    titleEs: 'Registro de Plantas y Protocolos de Cuidado',
    description: 'Botanical library with scientific names, care templates, native status, and linkable profiles. Each plant asset gets AI-generated care protocols.',
    descriptionEs: 'Biblioteca botánica con nombres científicos, plantillas de cuidado, estado nativo y perfiles vinculables. Cada planta recibe protocolos de cuidado generados por IA.',
    category: 'core',
  },
  {
    icon: FolderOpen,
    title: 'Document Vault',
    titleEs: 'Bóveda de Documentos',
    description: 'Digital binder for warranties, as-builts, irrigation plans, vendor contracts, insurance, and more. Track expiry dates and link to assets/zones.',
    descriptionEs: 'Carpeta digital para garantías, planos as-built, planes de riego, contratos, seguros y más. Rastrea vencimientos y vincula a activos/zonas.',
    category: 'core',
  },
  // Operations
  {
    icon: Clock,
    title: 'Worker Check-in & Shifts',
    titleEs: 'Registro de Turnos',
    description: 'QR-based clock-in/out system with GPS tracking, work logs, shift validations, and payment tracking per worker.',
    descriptionEs: 'Sistema de entrada/salida por QR con GPS, bitácoras de trabajo, validaciones de turno y seguimiento de pagos por trabajador.',
    category: 'operations',
  },
  {
    icon: DollarSign,
    title: 'Labor Management',
    titleEs: 'Gestión Laboral',
    description: 'Weekly shift summaries, hourly/daily rates, payment modals (cash, PayPal, transfer), and AI-powered shift validation.',
    descriptionEs: 'Resúmenes semanales de turnos, tarifas por hora/día, pagos (efectivo, PayPal, transferencia) y validación de turnos con IA.',
    category: 'operations',
  },
  {
    icon: Package,
    title: 'Tool & Supply Inventory',
    titleEs: 'Inventario de Herramientas',
    description: 'Track tools, chemicals, fertilizers, and supplies. Assign tools to workers, monitor conditions, and manage returns.',
    descriptionEs: 'Rastrea herramientas, químicos, fertilizantes y suministros. Asigna herramientas a trabajadores, monitorea condiciones y gestiona devoluciones.',
    category: 'operations',
  },
  {
    icon: Camera,
    title: 'Photo Evidence System',
    titleEs: 'Sistema de Evidencia Fotográfica',
    description: 'Capture geotagged, timestamped photos for check-ins, task completions, and asset documentation. Proof for duty-of-care reports.',
    descriptionEs: 'Captura fotos geoetiquetadas con marca de tiempo para registros, tareas y documentación. Evidencia para informes de deber de cuidado.',
    category: 'operations',
  },
  // Sustainability
  {
    icon: Recycle,
    title: 'Compost Manager (Full Cycle)',
    titleEs: 'Gestor de Compost (Ciclo Completo)',
    description: 'Track piles from creation to application. Log ingredients (green/brown ratio), temperature, moisture, turns. Apply finished compost to zones/assets.',
    descriptionEs: 'Rastrea pilas desde creación hasta aplicación. Registra ingredientes (ratio verde/marrón), temperatura, humedad, volteos. Aplica compost terminado a zonas/activos.',
    category: 'sustainability',
  },
  {
    icon: Mountain,
    title: 'Topography & Risk Analysis',
    titleEs: 'Topografía y Análisis de Riesgos',
    description: 'Import topographic data, draw elevation transects, analyze slope and drainage patterns. Identify erosion risks and plan interventions.',
    descriptionEs: 'Importa datos topográficos, traza transectos de elevación, analiza pendientes y patrones de drenaje. Identifica riesgos de erosión y planifica intervenciones.',
    category: 'sustainability',
  },
  {
    icon: Bell,
    title: 'Weather Alerts & Rules',
    titleEs: 'Alertas Climáticas',
    description: 'Define custom weather rules (freeze, heavy rain, wind, drought). System auto-creates tasks and notifies team when thresholds are triggered.',
    descriptionEs: 'Define reglas climáticas personalizadas (helada, lluvia, viento, sequía). El sistema crea tareas automáticamente y notifica al equipo cuando se activan umbrales.',
    category: 'sustainability',
  },
  // Business
  {
    icon: ShoppingBag,
    title: 'CRM & Sales (Full Suite)',
    titleEs: 'CRM y Ventas (Suite Completa)',
    description: 'Client directory, product/service catalog, invoice generation, payment tracking (cash, PayPal, transfer), and revenue history.',
    descriptionEs: 'Directorio de clientes, catálogo de productos/servicios, generación de facturas, seguimiento de pagos (efectivo, PayPal, transferencia) e historial de ingresos.',
    category: 'business',
  },
  {
    icon: BookOpen,
    title: 'AI Estate Manual Generator',
    titleEs: 'Generador de Manual con IA',
    description: 'AI generates a comprehensive property manual from verified system data: zones, assets, history, routines, and documentation index. Export as Markdown.',
    descriptionEs: 'La IA genera un manual integral de la propiedad con datos verificados del sistema: zonas, activos, historial, rutinas e índice de documentación. Exporta como Markdown.',
    category: 'business',
  },
  {
    icon: BarChart3,
    title: 'Duty of Care Reports (PDF)',
    titleEs: 'Informes de Deber de Cuidado (PDF)',
    description: 'Generate date-range PDF reports with completed tasks, field check-ins, photo evidence, and compliance documentation.',
    descriptionEs: 'Genera informes PDF por rango de fechas con tareas completadas, registros de campo, evidencia fotográfica y documentación de cumplimiento.',
    category: 'business',
  },
  // Platform
  {
    icon: Users,
    title: 'Role-based Access (Owner, Manager, Crew, Vendor)',
    titleEs: 'Acceso por Roles (Dueño, Gerente, Equipo, Proveedor)',
    description: 'Each role sees only what they need. Owners get full control, crew gets simplified mobile-first views, vendors see assigned tasks only.',
    descriptionEs: 'Cada rol ve solo lo que necesita. Dueños tienen control total, equipo tiene vistas móviles simplificadas, proveedores ven solo tareas asignadas.',
    category: 'platform',
  },
  {
    icon: QrCode,
    title: 'QR Code System',
    titleEs: 'Sistema de Códigos QR',
    description: 'Generate and print QR labels for assets. Scan to view asset details, start shifts, or log check-ins instantly.',
    descriptionEs: 'Genera e imprime etiquetas QR para activos. Escanea para ver detalles del activo, iniciar turnos o registrar visitas al instante.',
    category: 'platform',
  },
  {
    icon: Globe,
    title: 'Bilingual (EN/ES)',
    titleEs: 'Bilingüe (EN/ES)',
    description: 'Full interface in English and Spanish. Switch languages instantly. Task descriptions and alerts support both languages.',
    descriptionEs: 'Interfaz completa en inglés y español. Cambia de idioma al instante. Descripciones de tareas y alertas soportan ambos idiomas.',
    category: 'platform',
  },
  {
    icon: Zap,
    title: 'AI-Powered Intelligence',
    titleEs: 'Inteligencia con IA',
    description: 'AI suggests tasks based on asset profiles, generates care protocols for plants, validates worker shifts, and produces estate manuals.',
    descriptionEs: 'La IA sugiere tareas basadas en perfiles de activos, genera protocolos de cuidado, valida turnos de trabajadores y produce manuales de propiedad.',
    category: 'platform',
  },
  {
    icon: Shield,
    title: 'Subscription & Payments (PayPal)',
    titleEs: 'Suscripción y Pagos (PayPal)',
    description: 'Monthly ($19.99) or annual ($199.99) plans via PayPal. Secure payment processing with automatic subscription management.',
    descriptionEs: 'Planes mensuales ($19.99) o anuales ($199.99) por PayPal. Procesamiento seguro con gestión automática de suscripciones.',
    category: 'platform',
  },
];

const categoryLabels: Record<string, { en: string; es: string }> = {
  core: { en: '🏡 Core Estate Management', es: '🏡 Gestión de Propiedad' },
  operations: { en: '⚙️ Operations & Workforce', es: '⚙️ Operaciones y Personal' },
  sustainability: { en: '🌿 Sustainability & Environment', es: '🌿 Sostenibilidad y Medio Ambiente' },
  business: { en: '💼 Business & Reporting', es: '💼 Negocios y Reportes' },
  platform: { en: '🚀 Platform & Intelligence', es: '🚀 Plataforma e Inteligencia' },
};

const categoryOrder = ['core', 'operations', 'sustainability', 'business', 'platform'];

export default function Features() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const es = language === 'es';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
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
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
          {es ? 'Todo lo que Casa Guide puede hacer' : 'Everything Casa Guide Can Do'}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {es
            ? 'Una plataforma integral para gestionar propiedades, paisajes, equipos de trabajo, compost, ventas y más.'
            : 'A comprehensive platform to manage properties, landscapes, teams, compost, sales, and more.'}
        </p>
      </section>

      {/* Features by Category */}
      <section className="max-w-5xl mx-auto px-4 pb-16 space-y-12">
        {categoryOrder.map((cat) => (
          <div key={cat}>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-6">
              {es ? categoryLabels[cat].es : categoryLabels[cat].en}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features
                .filter((f) => f.category === cat)
                .map((feature, idx) => (
                  <Card key={idx} className="border border-border hover:border-primary/30 transition-colors">
                    <CardContent className="pt-5 pb-4 px-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <feature.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm leading-tight">
                            {es ? feature.titleEs : feature.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            {es ? feature.descriptionEs : feature.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 pb-16 text-center">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-10">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
              {es ? '¿Listo para empezar?' : 'Ready to get started?'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {es
                ? 'Crea tu cuenta gratis y configura tu primera propiedad en minutos.'
                : 'Create your free account and set up your first property in minutes.'}
            </p>
            <Button size="lg" onClick={() => navigate('/auth')}>
              {es ? 'Crear cuenta' : 'Create account'}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
