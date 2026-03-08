// Internationalization for Casa Guide
// Supports English and Spanish with icon-first approach for crew users

export type Language = 'en' | 'es';

export const translations = {
  en: {
    // Product
    product: {
      name: 'Casa Guide',
      tagline: 'Manage properties, landscapes, and living assets — all in one place.',
      description: 'Casa Guide is a comprehensive property management platform for estates, landscapes, assets, tasks, compost, CRM, and more.',
      differentiator: 'Property management tools manage people and generic tasks. Casa Guide manages living assets, operations, sales, and long-term risk.',
    },
    // Navigation
    nav: {
      home: 'Home',
      map: 'Map',
      assets: 'Assets',
      tasks: 'Tasks',
      log: 'Log',
      documents: 'Documents',
      admin: 'Admin',
      settings: 'Settings',
      logout: 'Sign Out',
    },
    // Common
    common: {
      search: 'Search...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      view: 'View',
      close: 'Close',
      loading: 'Loading...',
      noData: 'No data available',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      today: 'Today',
      yesterday: 'Yesterday',
      all: 'All',
      allTypes: 'All Types',
      allZones: 'All Zones',
      filterByType: 'Filter by type',
      filterByZone: 'Filter by zone',
      noResults: 'No results found',
      tryAdjusting: 'Try adjusting your filters',
      startAdding: 'Start by adding your first',
      assetsCount: 'assets',
      zonesCount: 'zones',
      filter: 'Filter',
      sort: 'Sort',
      export: 'Export',
    },
    // Dashboard / Home
    dashboard: {
      welcome: 'Welcome back',
      weatherWatch: 'Weather Watch',
      todaysObligations: "Today's Obligations",
      quickActions: 'Quick Actions',
      recentActivity: 'Recent Activity',
      newCheckin: 'New Check-in',
      addAsset: 'Add Asset',
      uploadDocument: 'Upload Document',
      viewAllTasks: 'View All Tasks',
      noAlerts: 'No active alerts',
      alertsActive: 'alerts active',
    },
    // Tasks
    tasks: {
      title: 'Tasks',
      myTasks: 'My Tasks',
      allTasks: 'All Tasks',
      due: 'Due',
      overdue: 'Overdue',
      done: 'Done',
      dueToday: 'Due Today',
      dueThisWeek: 'Due This Week',
      markComplete: 'Mark Complete',
      assignTo: 'Assign to',
      photoProofRequired: 'Photo proof required',
      addPhoto: 'Add Photo',
      taskDetails: 'Task Details',
      newTask: 'New Task',
      frequency: {
        once: 'One-time',
        weekly: 'Weekly',
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        annual: 'Annual',
        seasonal: 'Seasonal',
      },
    },
    // Assets
    assets: {
      title: 'Assets',
      allAssets: 'All Assets',
      byZone: 'By Zone',
      byType: 'By Type',
      plants: 'Plants',
      trees: 'Trees',
      irrigation: 'Irrigation',
      irrigationController: 'Irrigation Controller',
      valve: 'Valve',
      lightingTransformer: 'Lighting',
      lighting: 'Lighting',
      hardscape: 'Hardscape',
      equipment: 'Equipment',
      structures: 'Structures',
      assetDetails: 'Asset Details',
      purpose: 'Purpose',
      riskFlags: 'Risk Flags',
      criticalCare: 'Critical Care',
      doNotDo: 'Do Not Do',
      lastService: 'Last Service',
      installDate: 'Install Date',
      photos: 'Photos',
      relatedTasks: 'Related Tasks',
      relatedDocs: 'Related Documents',
      scanQR: 'Scan QR',
      generateQR: 'Generate QR',
      addAsset: 'Add Asset',
      noAssets: 'No assets found',
    },
    // Documents
    documents: {
      title: 'Documents',
      digitalBinder: 'Digital Binder',
      categories: {
        warranty: 'Warranty',
        asbuilt: 'As-Built',
        irrigation: 'Irrigation',
        lighting: 'Lighting',
        planting_plan: 'Planting Plan',
        vendor_contract: 'Vendor Contract',
        insurance: 'Insurance',
        other: 'Other',
      },
      expiringSoon: 'Expiring Soon',
      upload: 'Upload Document',
      linkToAsset: 'Link to Asset',
      linkToZone: 'Link to Zone',
      expiryDate: 'Expiry Date',
    },
    // Check-ins / Log
    checkins: {
      title: 'Activity Log',
      newCheckin: 'New Check-in',
      selectZone: 'Select Zone',
      selectAsset: 'Select Asset (Optional)',
      takePhoto: 'Take Photo',
      addNotes: 'Add Notes (Optional)',
      submit: 'Submit Check-in',
      recentCheckins: 'Recent Check-ins',
      checkinComplete: 'Check-in Complete',
    },
    // Weather
    weather: {
      title: 'Weather Watch',
      freeze: 'Freeze Warning',
      heavyRain: 'Heavy Rain',
      highWind: 'High Wind',
      drought: 'Drought Alert',
      next48h: 'Next 48 Hours',
      activeAlerts: 'Active Alerts',
      viewRules: 'View Rules',
      simulateAlert: 'Simulate Alert',
    },
    // Admin
    admin: {
      title: 'Admin',
      users: 'Users',
      vendors: 'Vendors',
      zones: 'Zones',
      weatherRules: 'Weather Rules',
      qrLabels: 'QR Labels',
      generateLabels: 'Generate Labels',
      printLabels: 'Print Labels',
    },
    // Auth
    auth: {
      signIn: 'Sign In',
      signUp: 'Create Account',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      signInWith: 'Sign in with',
      demoAccess: 'Demo Access',
      continueAsDemo: 'Continue as Demo User',
    },
    // Roles
    roles: {
      owner: 'Owner',
      manager: 'Manager',
      crew: 'Crew',
      vendor: 'Vendor',
    },
  },
  es: {
    // Product
    product: {
      name: 'Casa Guide',
      tagline: 'Gestiona propiedades, paisajes y activos vivos — todo en un solo lugar.',
      description: 'Casa Guide es una plataforma integral de gestión de propiedades para fincas, paisajes, activos, tareas, compost, CRM y más.',
      differentiator: 'Las herramientas de gestión de propiedades manejan personas y tareas genéricas. Casa Guide gestiona activos vivos, operaciones, ventas y riesgo a largo plazo.',
    },
    // Navigation
    nav: {
      home: 'Inicio',
      map: 'Mapa',
      assets: 'Activos',
      tasks: 'Tareas',
      log: 'Registro',
      documents: 'Documentos',
      admin: 'Admin',
      settings: 'Ajustes',
      logout: 'Cerrar Sesión',
    },
    // Common
    common: {
      search: 'Buscar...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      add: 'Agregar',
      view: 'Ver',
      close: 'Cerrar',
      loading: 'Cargando...',
      noData: 'Sin datos disponibles',
      confirm: 'Confirmar',
      back: 'Atrás',
      next: 'Siguiente',
      today: 'Hoy',
      yesterday: 'Ayer',
      all: 'Todo',
      allTypes: 'Todos los Tipos',
      allZones: 'Todas las Zonas',
      filterByType: 'Filtrar por tipo',
      filterByZone: 'Filtrar por zona',
      noResults: 'Sin resultados',
      tryAdjusting: 'Intenta ajustar los filtros',
      startAdding: 'Comienza agregando tu primer',
      assetsCount: 'activos',
      zonesCount: 'zonas',
      filter: 'Filtrar',
      sort: 'Ordenar',
      export: 'Exportar',
    },
    // Dashboard / Home
    dashboard: {
      welcome: 'Bienvenido',
      weatherWatch: 'Clima y Alertas',
      todaysObligations: 'Obligaciones de Hoy',
      quickActions: 'Acciones Rápidas',
      recentActivity: 'Actividad Reciente',
      newCheckin: 'Nuevo Registro',
      addAsset: 'Agregar Activo',
      uploadDocument: 'Subir Documento',
      viewAllTasks: 'Ver Todas las Tareas',
      noAlerts: 'Sin alertas activas',
      alertsActive: 'alertas activas',
    },
    // Tasks
    tasks: {
      title: 'Tareas',
      myTasks: 'Mis Tareas',
      allTasks: 'Todas las Tareas',
      due: 'Pendiente',
      overdue: 'Vencida',
      done: 'Hecha',
      dueToday: 'Vence Hoy',
      dueThisWeek: 'Vence Esta Semana',
      markComplete: 'Marcar Completo',
      assignTo: 'Asignar a',
      photoProofRequired: 'Se requiere foto',
      addPhoto: 'Agregar Foto',
      taskDetails: 'Detalles de Tarea',
      newTask: 'Nueva Tarea',
      frequency: {
        once: 'Una vez',
        weekly: 'Semanal',
        monthly: 'Mensual',
        quarterly: 'Trimestral',
        annual: 'Anual',
        seasonal: 'Estacional',
      },
    },
    // Assets
    assets: {
      title: 'Activos',
      allAssets: 'Todos los Activos',
      byZone: 'Por Zona',
      byType: 'Por Tipo',
      plants: 'Plantas',
      trees: 'Árboles',
      irrigation: 'Riego',
      irrigationController: 'Controlador de Riego',
      valve: 'Válvula',
      lightingTransformer: 'Iluminación',
      lighting: 'Iluminación',
      hardscape: 'Hardscape',
      equipment: 'Equipo',
      structures: 'Estructuras',
      assetDetails: 'Detalles del Activo',
      purpose: 'Propósito',
      riskFlags: 'Riesgos',
      criticalCare: 'Cuidado Crítico',
      doNotDo: 'No Hacer',
      lastService: 'Último Servicio',
      installDate: 'Fecha de Instalación',
      photos: 'Fotos',
      relatedTasks: 'Tareas Relacionadas',
      relatedDocs: 'Documentos Relacionados',
      scanQR: 'Escanear QR',
      generateQR: 'Generar QR',
      addAsset: 'Agregar Activo',
      noAssets: 'Sin activos',
    },
    // Documents
    documents: {
      title: 'Documentos',
      digitalBinder: 'Carpeta Digital',
      categories: {
        warranty: 'Garantía',
        asbuilt: 'As-Built',
        irrigation: 'Riego',
        lighting: 'Iluminación',
        planting_plan: 'Plan de Siembra',
        vendor_contract: 'Contrato de Proveedor',
        insurance: 'Seguro',
        other: 'Otro',
      },
      expiringSoon: 'Por Vencer',
      upload: 'Subir Documento',
      linkToAsset: 'Vincular a Activo',
      linkToZone: 'Vincular a Zona',
      expiryDate: 'Fecha de Vencimiento',
    },
    // Check-ins / Log
    checkins: {
      title: 'Registro de Actividad',
      newCheckin: 'Nuevo Registro',
      selectZone: 'Seleccionar Zona',
      selectAsset: 'Seleccionar Activo (Opcional)',
      takePhoto: 'Tomar Foto',
      addNotes: 'Agregar Notas (Opcional)',
      submit: 'Enviar Registro',
      recentCheckins: 'Registros Recientes',
      checkinComplete: 'Registro Completo',
    },
    // Weather
    weather: {
      title: 'Clima y Alertas',
      freeze: 'Alerta de Helada',
      heavyRain: 'Lluvia Fuerte',
      highWind: 'Viento Fuerte',
      drought: 'Alerta de Sequía',
      next48h: 'Próximas 48 Horas',
      activeAlerts: 'Alertas Activas',
      viewRules: 'Ver Reglas',
      simulateAlert: 'Simular Alerta',
    },
    // Admin
    admin: {
      title: 'Admin',
      users: 'Usuarios',
      vendors: 'Proveedores',
      zones: 'Zonas',
      weatherRules: 'Reglas del Clima',
      qrLabels: 'Etiquetas QR',
      generateLabels: 'Generar Etiquetas',
      printLabels: 'Imprimir Etiquetas',
    },
    // Auth
    auth: {
      signIn: 'Iniciar Sesión',
      signUp: 'Crear Cuenta',
      email: 'Correo',
      password: 'Contraseña',
      forgotPassword: '¿Olvidaste tu contraseña?',
      noAccount: '¿No tienes cuenta?',
      hasAccount: '¿Ya tienes cuenta?',
      signInWith: 'Iniciar sesión con',
      demoAccess: 'Acceso Demo',
      continueAsDemo: 'Continuar como Usuario Demo',
    },
    // Roles
    roles: {
      owner: 'Propietario',
      manager: 'Gerente',
      crew: 'Equipo',
      vendor: 'Proveedor',
    },
  },
} as const;

export type TranslationKeys = typeof translations.en;

export function t(lang: Language, path: string): string {
  const keys = path.split('.');
  let result: unknown = translations[lang];
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      // Fallback to English
      result = translations.en;
      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = (result as Record<string, unknown>)[k];
        } else {
          return path; // Return path if not found
        }
      }
      break;
    }
  }
  
  return typeof result === 'string' ? result : path;
}
