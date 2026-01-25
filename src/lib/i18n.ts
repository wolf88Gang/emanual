// Internationalization for Estate Manual
// Supports English and Spanish with icon-first approach for crew users

export type Language = 'en' | 'es';

export const translations = {
  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      map: 'Map',
      tasks: 'Tasks',
      assets: 'Assets',
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
      filter: 'Filter',
      sort: 'Sort',
      export: 'Export',
    },
    // Dashboard
    dashboard: {
      welcome: 'Welcome back',
      todaysTasks: "Today's Tasks",
      overdueItems: 'Overdue Items',
      recentActivity: 'Recent Activity',
      weatherAlerts: 'Weather Watch',
      quickActions: 'Quick Actions',
      startCheckin: 'Start Check-in',
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
      pending: 'Pending',
      inProgress: 'In Progress',
      completed: 'Completed',
      overdue: 'Overdue',
      dueToday: 'Due Today',
      dueThisWeek: 'Due This Week',
      markComplete: 'Mark Complete',
      assignTo: 'Assign to',
      photoRequired: 'Photo Required',
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
      lighting: 'Lighting',
      hardscape: 'Hardscape',
      equipment: 'Equipment',
      structures: 'Structures',
      assetDetails: 'Asset Details',
      careNotes: 'Care Notes',
      warnings: 'Warnings',
      lastService: 'Last Service',
      installDate: 'Install Date',
      riskFlags: 'Risk Flags',
      purposeTags: 'Purpose Tags',
      photos: 'Photos',
      relatedTasks: 'Related Tasks',
      relatedDocs: 'Related Documents',
      scanQR: 'Scan QR',
      generateQR: 'Generate QR',
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
    // Check-ins
    checkins: {
      title: 'Check-ins',
      startCheckin: 'Start Check-in',
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
    // Navigation
    nav: {
      dashboard: 'Panel',
      map: 'Mapa',
      tasks: 'Tareas',
      assets: 'Activos',
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
      filter: 'Filtrar',
      sort: 'Ordenar',
      export: 'Exportar',
    },
    // Dashboard
    dashboard: {
      welcome: 'Bienvenido',
      todaysTasks: 'Tareas de Hoy',
      overdueItems: 'Atrasados',
      recentActivity: 'Actividad Reciente',
      weatherAlerts: 'Alertas del Clima',
      quickActions: 'Acciones Rápidas',
      startCheckin: 'Registrar Entrada',
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
      pending: 'Pendiente',
      inProgress: 'En Progreso',
      completed: 'Completado',
      overdue: 'Atrasado',
      dueToday: 'Vence Hoy',
      dueThisWeek: 'Vence Esta Semana',
      markComplete: 'Marcar Completo',
      assignTo: 'Asignar a',
      photoRequired: 'Foto Requerida',
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
      lighting: 'Iluminación',
      hardscape: 'Hardscape',
      equipment: 'Equipo',
      structures: 'Estructuras',
      assetDetails: 'Detalles del Activo',
      careNotes: 'Notas de Cuidado',
      warnings: 'Advertencias',
      lastService: 'Último Servicio',
      installDate: 'Fecha de Instalación',
      riskFlags: 'Banderas de Riesgo',
      purposeTags: 'Etiquetas de Propósito',
      photos: 'Fotos',
      relatedTasks: 'Tareas Relacionadas',
      relatedDocs: 'Documentos Relacionados',
      scanQR: 'Escanear QR',
      generateQR: 'Generar QR',
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
        planting_plan: 'Plan de Plantación',
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
    // Check-ins
    checkins: {
      title: 'Registros',
      startCheckin: 'Registrar Entrada',
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
      title: 'Alertas del Clima',
      freeze: 'Alerta de Helada',
      heavyRain: 'Lluvia Fuerte',
      highWind: 'Viento Fuerte',
      drought: 'Alerta de Sequía',
      next48h: 'Próximas 48 Horas',
      activeAlerts: 'Alertas Activas',
      viewRules: 'Ver Reglas',
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
