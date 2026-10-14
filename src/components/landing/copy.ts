export type LandingLanguage = 'en' | 'es' | 'de';

export const publicAddonNames: Record<string, Record<LandingLanguage, string>> = {
  field_operations: { en: 'Visits and completed work', es: 'Visitas y trabajo realizado', de: 'Besuche und erledigte Arbeiten' },
  labor: { en: 'Team hours and shifts', es: 'Horas y turnos del equipo', de: 'Teamstunden und Schichten' },
  reminders: { en: 'Reminders', es: 'Recordatorios', de: 'Erinnerungen' },
  inventory: { en: 'Tools and supplies', es: 'Herramientas y materiales', de: 'Werkzeuge und Material' },
  client_portal: { en: 'Client portal', es: 'Portal de clientes', de: 'Kundenportal' },
  reports_manuals: { en: 'Reports and manuals', es: 'Reportes y manuales', de: 'Berichte und Handbücher' },
  financials: { en: 'Expenses and billing', es: 'Gastos y facturación', de: 'Ausgaben und Abrechnung' },
  topography: { en: 'Terrain and slopes', es: 'Terreno y pendientes', de: 'Gelände und Gefälle' },
  plant_care: { en: 'Plant care', es: 'Cuidado de plantas', de: 'Pflanzenpflege' },
};

type LocalCopy = {
  seo: { title: string; description: string };
  nav: { how: string; audience: string; capabilities: string; pricing: string; signIn: string; create: string; menu: string };
  hero: { eyebrow: string; title: string; body: string; support: string; primary: string; secondary: string; imageAlt: string };
  problem: { eyebrow: string; title: string; body: string; rows: [string, string][] };
  how: { eyebrow: string; title: string; body: string; steps: [string, string][] };
  connected: { eyebrow: string; title: string; body: string; modelLabel: string; modelNote: string; model: string[]; routes: [string, string[]][] };
  audience: { eyebrow: string; title: string; body: string; groups: [string, string][] };
  visibility: { eyebrow: string; title: string; body: string; labels: string[]; values: string[]; demo: string };
  capabilities: { eyebrow: string; title: string; body: string; items: [string, string][] };
  differences: { eyebrow: string; title: string; body: string; items: [string, string][] };
  trust: { eyebrow: string; title: string; body: string; items: [string, string][] };
  pricing: Record<string, string | string[]>;
  faq: { eyebrow: string; title: string; items: [string, string][] };
  final: { title: string; body: string; create: string; signIn: string };
  footer: string;
};

// Public wording only: the signed-in module registry remains unchanged.
export const landingModuleCopy: Record<string, Record<LandingLanguage, [string, string]>> = {
  projects: { es: ['Propiedades', 'Las casas, villas y otros sitios que atiende para cada cliente.'], en: ['Properties', 'The houses, villas and other sites you care for on each client’s behalf.'], de: ['Immobilien', 'Häuser, Villen und andere Orte, die Sie für Ihre Kunden betreuen.'] },
  assets: { es: ['Plantas, activos y equipos', 'Qué hay en cada propiedad, dónde está y cómo se encuentra.'], en: ['Plants, assets and equipment', 'What is at each property, where it is and its condition.'], de: ['Pflanzen, Anlagen und Geräte', 'Was an jeder Immobilie vorhanden ist, wo es steht und in welchem Zustand es ist.'] },
  map: { es: ['Mapa y zonas', 'Ubique jardines, equipos y zonas de trabajo en el mapa de la propiedad.'], en: ['Map and areas', 'Locate gardens, equipment and work areas on the property map.'], de: ['Karte und Bereiche', 'Finden Sie Gärten, Geräte und Arbeitsbereiche auf der Immobilienkarte.'] },
  tasks: { es: ['Tareas', 'Organice lo que hay que hacer y el mantenimiento pendiente.'], en: ['Tasks', 'Organize what needs doing and pending maintenance.'], de: ['Aufgaben', 'Organisieren Sie anstehende Arbeiten und offene Wartung.'] },
  visits: { es: ['Visitas', 'Registre el trabajo de cada visita con fotos, notas y llegada al sitio.'], en: ['Visits', 'Record each visit’s work with photos, notes and arrival check-ins.'], de: ['Besuche', 'Halten Sie Arbeiten jedes Besuchs mit Fotos, Notizen und Ankunft fest.'] },
  plants_pots: { es: ['Plantas y macetas', 'Sepa qué plantas atiende, dónde están y cuándo se reemplazaron.'], en: ['Plants and pots', 'Know which plants you care for, where they are and when they were replaced.'], de: ['Pflanzen und Töpfe', 'Sehen Sie, welche Pflanzen Sie betreuen, wo sie stehen und wann sie ersetzt wurden.'] },
  care: { es: ['Cuidados', 'Consulte fechas de riego, instrucciones y cuidados realizados.'], en: ['Care', 'Check watering dates, instructions and care already provided.'], de: ['Pflege', 'Sehen Sie Gießtermine, Anweisungen und bereits erledigte Pflege.'] },
};

export const landingCopy: Record<LandingLanguage, LocalCopy> = {
  "es": {
    "seo": {
      "title": "HomeGuide | Organiza el trabajo de cada propiedad",
      "description": "HomeGuide organiza el trabajo, las personas y la información de cada propiedad para que propietarios, administradores, proveedores y trabajadores sepan qué pasa, qué falta y qué sigue."
    },
    "nav": {
      "how": "Cómo funciona",
      "audience": "Para quién es",
      "capabilities": "Qué puede hacer",
      "pricing": "Precios",
      "signIn": "Ingresar",
      "create": "Crear cuenta",
      "menu": "Abrir navegación"
    },
    "hero": {
      "eyebrow": "PARA PROPIEDADES Y LOS EQUIPOS QUE LAS ATIENDEN",
      "title": "Cada propiedad tiene mucho que coordinar. HomeGuide lo pone en orden.",
      "body": "Reúna en un solo lugar las tareas, visitas, instrucciones, fotos, historial y personas relacionadas con cada propiedad. Propietarios, administradores, proveedores y trabajadores pueden entender qué está pasando, qué falta y qué sigue.",
      "support": "Casas, condominios, edificios, comercios, jardines y otros espacios que necesitan trabajo y mantenimiento continuo.",
      "primary": "Crear cuenta",
      "secondary": "Ver cómo funciona",
      "imageAlt": "Una propiedad con jardines y áreas que necesitan cuidado y mantenimiento"
    },
    "problem": {
      "eyebrow": "EL PROBLEMA",
      "title": "Cuando muchas personas participan, la información se pierde.",
      "body": "Una propiedad puede tener dueño, administrador, seguridad, mantenimiento y varios proveedores. Si cada uno trabaja desde chats, llamadas, papeles o memoria, nadie tiene la historia completa.",
      "rows": [
        [
          "Cada propiedad tiene sus propias reglas",
          "Accesos, horarios, prioridades e instrucciones cambian de una propiedad a otra. Tenerlos claros evita preguntas y confusiones."
        ],
        [
          "Las personas cambian",
          "Cuando cambia el administrador, un proveedor o alguien del equipo, las instrucciones y el historial deben seguir disponibles."
        ],
        [
          "La información queda repartida",
          "Una foto en un chat, una nota en papel y un acuerdo por teléfono no permiten saber fácilmente qué pasó ni qué falta."
        ]
      ]
    },
    "how": {
      "eyebrow": "CÓMO FUNCIONA",
      "title": "Una propiedad, la información reunida y el trabajo claro.",
      "body": "Desde organizar los espacios hasta coordinar a las personas y conservar lo que ocurrió.",
      "steps": [
        [
          "Organice la propiedad",
          "Reúna sus zonas, elementos importantes e instrucciones para que todos sepan dónde y cómo trabajar."
        ],
        [
          "Defina lo que necesita",
          "Anote tareas, visitas, cuidados y mantenimiento pendiente, con prioridades y fechas."
        ],
        [
          "Coordine quién lo hace",
          "Asigne responsables y deje claras las instrucciones para el personal y los proveedores que atienden la propiedad."
        ],
        [
          "Registre lo que pasó",
          "Guarde fotos, notas y trabajo realizado junto a la propiedad. Así se puede revisar qué falta y qué sigue."
        ]
      ]
    },
    "connected": {
      "eyebrow": "MEMORIA DE CADA PROPIEDAD",
      "title": "Cuando cambia la persona, la información no se va con ella.",
      "body": "Las instrucciones, trabajos, fotos y notas quedan ligados a la propiedad donde ocurrieron. La siguiente persona puede continuar desde donde terminó la anterior.",
      "modelLabel": "La propiedad reúne la información",
      "modelNote": "Las instrucciones, personas, trabajos y registros se consultan junto a la propiedad correspondiente. Incluya la zona o el elemento cuando corresponda.",
      "model": [
        "Propiedad",
        "Zona / elemento",
        "Instrucciones",
        "Trabajo",
        "Responsable",
        "Registro"
      ],
      "routes": []
    },
    "audience": {
      "eyebrow": "PARA QUIÉN ES",
      "title": "Distintas personas. Una misma propiedad.",
      "body": "Sea dueño, administrador, proveedor o parte del equipo, el punto de partida es la propiedad y lo que necesita.",
      "groups": [
        [
          "Tengo o administro propiedades",
          "Casas, condominios, villas, edificios y centros comerciales. Reúna instrucciones y revise el trabajo de personal de mantenimiento, seguridad y proveedores."
        ],
        [
          "Doy servicios a propiedades",
          "Paisajismo, jardinería, mantenimiento, control de plagas, fontanería y otros servicios. Organice el trabajo de cada propiedad y conserve lo que se hizo."
        ],
        [
          "Trabajo en propiedades",
          "Trabajadores independientes, contratistas, cuadrillas y personal de la propiedad. Consulte el trabajo asignado, sus instrucciones y lo pendiente, y registre el resultado."
        ]
      ]
    },
    "visibility": {
      "eyebrow": "EN UNA SOLA VISTA",
      "title": "Abra una propiedad y entienda qué está pasando.",
      "body": "Vea qué necesita la propiedad, cuándo fue la última visita, qué se hizo, quién lo hizo, qué fotos quedaron y qué toca después.",
      "labels": [
        "Cliente",
        "Propiedad",
        "Instrucción del cliente",
        "Última visita",
        "Trabajo realizado",
        "Responsable",
        "Fotos",
        "Nota",
        "Próxima visita",
        "Pendiente"
      ],
      "values": [
        "Villa Mar",
        "Casa 12",
        "Mantener los setos bajos sin bloquear la entrada",
        "6 oct",
        "Poda de setos + revisión de riego",
        "Daniel",
        "4",
        "Sector norte necesita revisión de válvula",
        "Jueves",
        "Revisar válvula de riego"
      ],
      "demo": "Ejemplo de una visita · datos ficticios"
    },
    "capabilities": {
      "eyebrow": "LO QUE PUEDE HACER",
      "title": "Todo lo necesario para que el trabajo no dependa de la memoria.",
      "body": "Reúna lo que las personas necesitan para atender la propiedad y lo que debe quedar claro después.",
      "items": [
        [
          "Clientes y propiedades",
          "Guarde las instrucciones y detalles de cada cliente y propiedad para saber cómo atenderlos."
        ],
        [
          "Tareas y visitas",
          "Organice lo pendiente, asigne responsables y planifique las próximas visitas y fechas de mantenimiento."
        ],
        [
          "Equipos y responsables",
          "Sepa quién atiende cada trabajo y gestione turnos, horas y herramientas según las funciones que active."
        ],
        [
          "Fotos, notas e historial",
          "Deje constancia de lo que se hizo, lo que cambió y lo que todavía necesita atención."
        ],
        [
          "Plantas, activos y equipos",
          "Consulte qué cuidados o mantenimiento necesita cada elemento y revise su historial."
        ],
        [
          "Información para el cliente",
          "Comparta el trabajo realizado mediante portales, reportes y documentos, según las funciones y el acceso que habilite."
        ]
      ]
    },
    "differences": {
      "eyebrow": "POR QUÉ HOMEGUIDE",
      "title": "Menos memoria, menos preguntas, más continuidad.",
      "body": "Una misma propiedad reúne las instrucciones, las personas y el historial. No hay que volver a contar toda la historia para cada trabajo.",
      "items": [
        [
          "La información se queda con la propiedad",
          "Las instrucciones, tareas, fotos y notas se consultan junto al lugar al que pertenecen, no en conversaciones separadas."
        ],
        [
          "La siguiente persona sabe por dónde continuar",
          "Puede revisar lo anterior y lo pendiente sin depender de que alguien le cuente toda la historia."
        ],
        [
          "La misma información sirve para distintos trabajos",
          "Las tareas, visitas y consultas usan las instrucciones y el historial de la propiedad, sin tener que empezar desde cero cada vez."
        ],
        [
          "El administrador ve lo que está pasando",
          "Revise responsables, trabajo realizado y pendientes de las propiedades que administra."
        ],
        [
          "El cliente puede entender lo que recibió",
          "Comparta la información del servicio que corresponda, sin obligar al cliente a preguntar a varias personas."
        ],
        [
          "El historial ayuda a evitar repetir errores",
          "Consulte problemas anteriores, cambios y notas importantes antes de hacer el siguiente trabajo."
        ]
      ]
    },
    "trust": {
      "eyebrow": "INFORMACIÓN PRIVADA",
      "title": "Cada persona ve lo que necesita para hacer su trabajo.",
      "body": "Organice el acceso de las personas que atienden la propiedad y decida qué información comparte con el cliente.",
      "items": [
        [
          "Acceso según el trabajo",
          "Dueños, administradores y equipos tienen distintas herramientas y accesos según su función y asignación."
        ],
        [
          "Información que decide compartir",
          "El portal muestra al cliente las secciones que habilite. Las notas internas no se incluyen en el portal del cliente."
        ],
        [
          "Un historial útil",
          "Las visitas y los trabajos completados conservan fotos, notas, responsables y fechas para consultar lo que ocurrió."
        ]
      ]
    },
    "pricing": {
      "eyebrow": "PRECIOS",
      "title": "Elija cuántas propiedades atiende y qué necesita su equipo.",
      "body": "Cada propiedad es un lugar real que atiende: una casa, una villa, un condominio u otro sitio de un cliente. Las funciones opcionales se cobran por cuenta, no por propiedad.",
      "monthly": "Mensual",
      "annual": "Anual",
      "annualNote": "Pague 10 meses, use 12",
      "properties": "Propiedades",
      "perProperty": "por propiedad / mes",
      "extras": "Funciones opcionales",
      "extrasBody": "Nueve funciones opcionales con precio por cuenta. Elija solo las que necesita su equipo.",
      "groupOperation": "Operación",
      "groupOperationBody": "Organice el trabajo del equipo, sus horas y las próximas tareas.",
      "groupManagement": "Gestión",
      "groupManagementBody": "Gestione herramientas, información para clientes, documentos y cobros.",
      "groupAnalysis": "Análisis",
      "groupAnalysisBody": "Revise el terreno y sus pendientes con herramientas de topografía.",
      "groupSpecialized": "Especializado",
      "groupSpecializedBody": "Cuidados para las plantas que atiende. La venta, el alquiler o los reemplazos dependen de su configuración, no de un cobro aparte.",
      "accountMonth": "cuenta / mes",
      "summary": "Su estimado",
      "dueMonthly": "por mes",
      "dueAnnual": "facturado anualmente",
      "saving": "Ahorro",
      "continue": "Crear cuenta y continuar",
      "included": "Base de cada cuenta",
      "includedItems": [
        "Clientes, propiedades y activos",
        "Tareas, registros e informes",
        "Interfaz EN, ES y DE",
        "Visualización USD y CRC"
      ],
      "decrease": "Reducir propiedades",
      "increase": "Aumentar propiedades",
      "catalogTitle": "Más herramientas para el trabajo de su equipo",
      "catalogBody": "Consulte las herramientas disponibles y elija las que necesita para atender sus propiedades.",
      "catalogNote": "La disponibilidad depende de las funciones y la configuración que active.",
      "capabilityCore": "Clientes, propiedades y documentos",
      "capabilityField": "Visitas, tareas y equipo",
      "capabilityCare": "Cuidados y próximas fechas",
      "capabilityAdmin": "Información para clientes y administración",
      "addon_field_operations": "Visitas, responsables, fotos y notas del trabajo realizado.",
      "addon_labor": "Turnos, horas y tarifas del equipo, con rutinas de limpieza.",
      "addon_reminders": "Recordatorios para tareas, mantenimiento y próximas fechas.",
      "addon_inventory": "Herramientas y materiales que su equipo utiliza en el trabajo.",
      "addon_client_portal": "Comparta con cada cliente la información que habilite en su portal.",
      "addon_reports_manuals": "Reportes del trabajo y manuales para consultar y compartir.",
      "addon_topography": "Revise elevaciones y pendientes del terreno.",
      "addon_financials": "Organice gastos, facturación y registros de pagos.",
      "addon_plant_care": "Consulte cuidados, fechas y recomendaciones para cada planta."
    },
    "faq": {
      "eyebrow": "PREGUNTAS FRECUENTES",
      "title": "Preguntas antes de la próxima visita",
      "items": [
        [
          "¿HomeGuide es solo para paisajismo?",
          "No. HomeGuide reúne el trabajo y la información de la propiedad para propietarios, administradores, proveedores y trabajadores. Sirve para coordinar mantenimiento y otros trabajos, sean recurrentes o puntuales."
        ],
        [
          "¿Qué pasa si cambia la persona que atiende una propiedad?",
          "Las instrucciones, tareas, fotos y notas permanecen en la propiedad. La persona nueva, con el acceso correspondiente, puede revisar lo que se hizo y lo que sigue pendiente."
        ],
        [
          "¿Puedo guardar fotos y notas de cada visita?",
          "Sí. Puede registrar fotos y notas de las visitas y del trabajo completado para consultarlas después junto a la propiedad correspondiente."
        ],
        [
          "¿El cliente puede ver lo que se hizo?",
          "Sí, si habilita el portal del cliente y las secciones que desea compartir. La disponibilidad depende de las funciones activadas y de los accesos que configure."
        ],
        [
          "¿Puedo manejar varias propiedades y clientes?",
          "Sí. Puede organizar varios clientes y las propiedades que atiende para cada uno. El precio base se calcula por propiedad; las funciones opcionales se cobran por cuenta."
        ],
        [
          "¿Es solo para plantas?",
          "No. El cuidado de plantas es una función opcional. También puede organizar mantenimiento, tareas, visitas y trabajo en otras partes de la propiedad."
        ]
      ]
    },
    "final": {
      "title": "Que la próxima visita no empiece desde cero.",
      "body": "Organice cada propiedad, deje claro qué hay que hacer y conserve el historial de lo que su equipo ya hizo.",
      "create": "Crear cuenta",
      "signIn": "Ingresar"
    },
    "footer": "Qué necesita cada propiedad, qué se hizo y qué sigue."
  },
  "en": {
    "seo": {
      "title": "HomeGuide | Organize the work at every property",
      "description": "HomeGuide organizes work, people and information around each property so owners, managers, service providers and workers know what is happening, what is missing and what comes next."
    },
    "nav": {
      "how": "How it works",
      "audience": "Who it's for",
      "capabilities": "What you can do",
      "pricing": "Pricing",
      "signIn": "Sign in",
      "create": "Create account",
      "menu": "Open navigation"
    },
    "hero": {
      "eyebrow": "FOR PROPERTIES AND THE PEOPLE WHO LOOK AFTER THEM",
      "title": "Every property has a lot to coordinate. HomeGuide brings it all together.",
      "body": "Bring tasks, visits, instructions, photos, history and the people involved with each property into one place. Owners, managers, service providers and workers can see what is happening, what still needs attention and what comes next.",
      "support": "Homes, condominiums, buildings, shops, gardens and other spaces that need ongoing work and maintenance.",
      "primary": "Create account",
      "secondary": "See how it works",
      "imageAlt": "A property with gardens and areas that need regular care and maintenance"
    },
    "problem": {
      "eyebrow": "THE PROBLEM",
      "title": "When many people are involved, information gets lost.",
      "body": "A property may have an owner, a manager, security staff, maintenance staff and several service providers. If everyone relies on chats, calls, paperwork or memory, no one has the full picture.",
      "rows": [
        [
          "Every property has its own rules",
          "Access, schedules, priorities and instructions vary from property to property. Keeping them clear avoids questions and confusion."
        ],
        [
          "People change",
          "When a manager, contractor or team member changes, the instructions and history need to stay available."
        ],
        [
          "Information ends up scattered",
          "A photo in a chat, a note on paper and an agreement over the phone make it hard to see what happened and what is still missing."
        ]
      ]
    },
    "how": {
      "eyebrow": "HOW IT WORKS",
      "title": "One property. Information together. Clear work.",
      "body": "Organize the spaces, coordinate the people and keep a record of what happened.",
      "steps": [
        [
          "Organize the property",
          "Keep its areas, important items and instructions together so everyone knows where and how to work."
        ],
        [
          "Define what it needs",
          "List tasks, visits, care and pending maintenance, with priorities and dates."
        ],
        [
          "Coordinate who does it",
          "Assign the work and make the instructions clear for staff and service providers looking after the property."
        ],
        [
          "Record what happened",
          "Keep photos, notes and completed work with the property so everyone can check what is still needed and what comes next."
        ]
      ]
    },
    "connected": {
      "eyebrow": "EVERY PROPERTY’S MEMORY",
      "title": "When the person changes, the information stays.",
      "body": "Instructions, work, photos and notes stay with the property where they belong. The next person can pick up where the previous person left off.",
      "modelLabel": "The property brings the information together",
      "modelNote": "Find instructions, people, work and records with the property they belong to. Include the area or item where relevant.",
      "model": [
        "Property",
        "Area / item",
        "Instructions",
        "Work",
        "Person responsible",
        "Record"
      ],
      "routes": []
    },
    "audience": {
      "eyebrow": "WHO IT’S FOR",
      "title": "Different people. The same property.",
      "body": "Whether you own, manage, service or work at a property, it starts with that property and what it needs.",
      "groups": [
        [
          "I own or manage properties",
          "Homes, condominiums, villas, buildings and shopping centers. Keep instructions together and review work by maintenance staff, security and service providers."
        ],
        [
          "I provide property services",
          "Landscaping, gardening, maintenance, pest control, plumbing and other services. Organize work at each property and keep a record of what was done."
        ],
        [
          "I work at properties",
          "Independent workers, contractors, crews and property staff. Check assigned work, instructions and pending tasks, then record the result."
        ]
      ]
    },
    "visibility": {
      "eyebrow": "AT A GLANCE",
      "title": "Open a property and see what’s happening.",
      "body": "See what the property needs, when the last visit took place, what was done, who did it, the photos left behind and what comes next.",
      "labels": [
        "Client",
        "Property",
        "Client instruction",
        "Last visit",
        "Work completed",
        "Team member",
        "Photos",
        "Note",
        "Next visit",
        "Pending"
      ],
      "values": [
        "Villa Mar",
        "House 12",
        "Keep hedges low without blocking the entrance",
        "6 Oct",
        "Hedge trimming + irrigation check",
        "Daniel",
        "4",
        "North area needs a valve inspection",
        "Thursday",
        "Check irrigation valve"
      ],
      "demo": "Example service visit · fictional data"
    },
    "capabilities": {
      "eyebrow": "WHAT YOU CAN DO",
      "title": "Everything you need so the work doesn’t rely on memory.",
      "body": "Keep together what people need to look after the property and what should be clear afterwards.",
      "items": [
        [
          "Clients and properties",
          "Save each client’s and property’s instructions and details so your team knows how to care for them."
        ],
        [
          "Tasks and visits",
          "Organize pending work, assign team members and plan upcoming visits and maintenance dates."
        ],
        [
          "Teams and responsibilities",
          "Know who is doing each job and manage shifts, hours and tools with the features you enable."
        ],
        [
          "Photos, notes and history",
          "Keep a useful account of what was done, what changed and what still needs attention."
        ],
        [
          "Plants, assets and equipment",
          "Check the care or maintenance each item needs and look back at its history."
        ],
        [
          "Information for the client",
          "Share completed work through portals, reports and documents, depending on the features and access you enable."
        ]
      ]
    },
    "differences": {
      "eyebrow": "WHY HOMEGUIDE",
      "title": "Less to remember. Fewer questions. Easier handovers.",
      "body": "Instructions, people and history come together at the same property. There is no need to retell the whole story for every job.",
      "items": [
        [
          "Information stays with the property",
          "Find instructions, tasks, photos and notes alongside the place they belong to, not scattered across conversations."
        ],
        [
          "The next person knows where to pick up",
          "They can review previous work and pending tasks without needing someone to retell the whole story."
        ],
        [
          "The same information supports different jobs",
          "Tasks, visits and checks use the property’s instructions and history, without starting from scratch each time."
        ],
        [
          "The manager sees what is happening",
          "Review who did the work, what was completed and what is pending at the properties you manage."
        ],
        [
          "The client can understand the service they received",
          "Share the relevant service information so the client does not have to ask several people."
        ],
        [
          "History helps avoid repeating mistakes",
          "Check previous problems, changes and important notes before starting the next job."
        ]
      ]
    },
    "trust": {
      "eyebrow": "PRIVATE INFORMATION",
      "title": "Each person sees what they need to do their job.",
      "body": "Manage access for the people looking after the property and decide what information to share with the client.",
      "items": [
        [
          "Access that fits the job",
          "Owners, managers and teams have different tools and access based on their role and assignments."
        ],
        [
          "Information you choose to share",
          "The client portal shows the sections you enable. Internal notes are not included in the client portal."
        ],
        [
          "A useful history",
          "Visits and completed work keep photos, notes, team members and dates so you can look back at what happened."
        ]
      ]
    },
    "pricing": {
      "eyebrow": "PRICING",
      "title": "Choose how many properties you serve and what your team needs.",
      "body": "A property is a real place you care for: a house, villa, condominium or another client site. Optional features are charged per account, not per property.",
      "monthly": "Monthly",
      "annual": "Annual",
      "annualNote": "Pay for 10 months, use 12",
      "properties": "Properties",
      "perProperty": "per property / month",
      "extras": "Optional features",
      "extrasBody": "Nine optional features, priced per account. Choose only what your team needs.",
      "groupOperation": "Operation",
      "groupOperationBody": "Organize the team’s work, hours and upcoming tasks.",
      "groupManagement": "Management",
      "groupManagementBody": "Manage tools, client information, documents and billing.",
      "groupAnalysis": "Analysis",
      "groupAnalysisBody": "Review terrain and slopes with topography tools.",
      "groupSpecialized": "Specialized",
      "groupSpecializedBody": "Care for the plants you service. Sales, rentals or replacements depend on your setup, not on a separate charge.",
      "accountMonth": "account / month",
      "summary": "Your estimate",
      "dueMonthly": "per month",
      "dueAnnual": "billed annually",
      "saving": "Saving",
      "continue": "Create account and continue",
      "included": "Every account starts with",
      "includedItems": [
        "Clients, properties and assets",
        "Tasks, records and reports",
        "EN, ES and DE interface",
        "USD and CRC display"
      ],
      "decrease": "Decrease properties",
      "increase": "Increase properties",
      "catalogTitle": "More tools for your team’s work",
      "catalogBody": "Browse the available tools and choose what you need to care for your properties.",
      "catalogNote": "Availability depends on the features and setup you enable.",
      "capabilityCore": "Clients, properties and documents",
      "capabilityField": "Visits, tasks and teams",
      "capabilityCare": "Care and upcoming dates",
      "capabilityAdmin": "Client information and administration",
      "addon_field_operations": "Visits, assigned team members, photos and notes of completed work.",
      "addon_labor": "Team shifts, hours and rates, including cleaning routines.",
      "addon_reminders": "Reminders for tasks, maintenance and upcoming dates.",
      "addon_inventory": "Tools and supplies your team uses on the job.",
      "addon_client_portal": "Share the information you enable in each client’s portal.",
      "addon_reports_manuals": "Work reports and manuals to refer to and share.",
      "addon_topography": "Review terrain elevations and slopes.",
      "addon_financials": "Organize expenses, billing and payment records.",
      "addon_plant_care": "Check care instructions, dates and recommendations for each plant."
    },
    "faq": {
      "eyebrow": "FREQUENT QUESTIONS",
      "title": "Questions before the next visit",
      "items": [
        [
          "Is HomeGuide only for landscaping?",
          "No. HomeGuide brings property work and information together for owners, managers, service providers and workers. It helps coordinate maintenance and other work, whether recurring or one-off."
        ],
        [
          "What happens when someone else takes over a property?",
          "Instructions, tasks, photos and notes stay with the property. With the appropriate access, the next person can review what was done and what is still pending."
        ],
        [
          "Can I save photos and notes from each visit?",
          "Yes. You can record photos and notes from visits and completed work, then find them later alongside the relevant property."
        ],
        [
          "Can the client see what was done?",
          "Yes, if you enable the client portal and the sections you want to share. Availability depends on the features you enable and the access you configure."
        ],
        [
          "Can I manage several properties and clients?",
          "Yes. You can organize multiple clients and the properties you care for on their behalf. The base price is per property; optional features are charged per account."
        ],
        [
          "Is it only for plants?",
          "No. Plant care is optional. You can also organize maintenance, tasks, visits and work in other parts of a property."
        ]
      ]
    },
    "final": {
      "title": "Make sure the next visit doesn’t start from scratch.",
      "body": "Organize each property, make the work clear and keep a history of what your team has already done.",
      "create": "Create account",
      "signIn": "Sign in"
    },
    "footer": "What each property needs, what was done and what comes next."
  },
  "de": {
    "seo": {
      "title": "HomeGuide | Die Arbeit an jeder Immobilie organisieren",
      "description": "HomeGuide bündelt Arbeit, Menschen und Informationen je Immobilie. Eigentümer, Verwaltung, Dienstleister und Mitarbeitende sehen, was passiert, was fehlt und was als Nächstes ansteht."
    },
    "nav": {
      "how": "So funktioniert es",
      "audience": "Für wen",
      "capabilities": "Was Sie tun können",
      "pricing": "Preise",
      "signIn": "Anmelden",
      "create": "Konto erstellen",
      "menu": "Navigation öffnen"
    },
    "hero": {
      "eyebrow": "FÜR IMMOBILIEN UND DIE MENSCHEN, DIE SIE BETREUEN",
      "title": "Rund um jede Immobilie gibt es viel zu koordinieren. HomeGuide schafft Ordnung.",
      "body": "Bündeln Sie Aufgaben, Besuche, Anweisungen, Fotos, bisherige Arbeiten und beteiligte Personen an einem Ort. Eigentümer, Verwaltung, Dienstleister und Mitarbeitende sehen, was gerade passiert, was noch fehlt und was als Nächstes ansteht.",
      "support": "Häuser, Wohnanlagen, Gebäude, Geschäfte, Gärten und andere Orte, an denen regelmäßig Arbeit und Instandhaltung anfallen.",
      "primary": "Konto erstellen",
      "secondary": "So funktioniert es",
      "imageAlt": "Eine Immobilie mit Gärten und Bereichen, die regelmäßig gepflegt und instand gehalten werden"
    },
    "problem": {
      "eyebrow": "DAS PROBLEM",
      "title": "Wenn viele Menschen beteiligt sind, gehen Informationen verloren.",
      "body": "Zu einer Immobilie gehören oft Eigentümer, Verwaltung, Sicherheitsdienst, Haustechnik und mehrere Dienstleister. Wenn alle mit Chats, Anrufen, Papier oder aus dem Gedächtnis arbeiten, hat niemand das ganze Bild.",
      "rows": [
        [
          "Jede Immobilie hat ihre eigenen Regeln",
          "Zugang, Zeiten, Prioritäten und Anweisungen unterscheiden sich von Ort zu Ort. Klare Informationen vermeiden Rückfragen und Missverständnisse."
        ],
        [
          "Menschen wechseln",
          "Wenn die Verwaltung, ein Dienstleister oder jemand im Team wechselt, müssen Anweisungen und bisherige Arbeiten weiter verfügbar bleiben."
        ],
        [
          "Informationen liegen verstreut",
          "Ein Foto im Chat, eine Notiz auf Papier und eine telefonische Absprache machen es schwer zu erkennen, was passiert ist und was noch fehlt."
        ]
      ]
    },
    "how": {
      "eyebrow": "SO FUNKTIONIERT ES",
      "title": "Eine Immobilie. Alle Informationen zusammen. Klare Aufgaben.",
      "body": "Ordnen Sie die Bereiche, stimmen Sie die Arbeit ab und halten Sie fest, was passiert ist.",
      "steps": [
        [
          "Die Immobilie organisieren",
          "Bündeln Sie Bereiche, wichtige Gegenstände und Anweisungen, damit alle wissen, wo und wie sie arbeiten sollen."
        ],
        [
          "Festlegen, was nötig ist",
          "Erfassen Sie Aufgaben, Besuche, Pflege und anstehende Wartung mit Prioritäten und Terminen."
        ],
        [
          "Abstimmen, wer es übernimmt",
          "Weisen Sie Verantwortliche zu und halten Sie Anweisungen für Personal und Dienstleister klar fest."
        ],
        [
          "Festhalten, was passiert ist",
          "Speichern Sie Fotos, Notizen und erledigte Arbeiten bei der Immobilie. So bleibt klar, was noch fehlt und was als Nächstes ansteht."
        ]
      ]
    },
    "connected": {
      "eyebrow": "DAS GEDÄCHTNIS JEDER IMMOBILIE",
      "title": "Wenn die Person wechselt, bleibt das Wissen.",
      "body": "Anweisungen, Arbeiten, Fotos und Notizen bleiben bei der Immobilie, zu der sie gehören. Die nächste Person kann dort weitermachen, wo die vorherige aufgehört hat.",
      "modelLabel": "Die Immobilie bündelt die Informationen",
      "modelNote": "Anweisungen, Personen, Arbeiten und Einträge finden Sie bei der zugehörigen Immobilie. Bereich oder Gegenstand werden bei Bedarf zugeordnet.",
      "model": [
        "Immobilie",
        "Bereich / Gegenstand",
        "Anweisungen",
        "Arbeit",
        "Verantwortlich",
        "Eintrag"
      ],
      "routes": []
    },
    "audience": {
      "eyebrow": "FÜR WEN",
      "title": "Verschiedene Menschen. Dieselbe Immobilie.",
      "body": "Ob Eigentümer, Verwaltung, Dienstleister oder Mitarbeitende: Ausgangspunkt ist die Immobilie und das, was sie braucht.",
      "groups": [
        [
          "Ich besitze oder verwalte Immobilien",
          "Häuser, Wohnanlagen, Villen, Gebäude und Einkaufszentren. Bündeln Sie Anweisungen und sehen Sie, was Haustechnik, Sicherheitsdienst und andere Dienstleister erledigt haben."
        ],
        [
          "Ich biete Dienstleistungen für Immobilien an",
          "Gartenpflege, Instandhaltung, Schädlingsbekämpfung, Sanitärarbeiten und andere Leistungen. Organisieren Sie die Arbeit je Immobilie und halten Sie fest, was erledigt wurde."
        ],
        [
          "Ich arbeite an Immobilien",
          "Selbstständige, Auftragnehmer, Teams und Personal vor Ort. Sehen Sie zugewiesene Aufgaben, Anweisungen und offene Arbeiten und halten Sie das Ergebnis fest."
        ]
      ]
    },
    "visibility": {
      "eyebrow": "AUF EINEN BLICK",
      "title": "Eine Immobilie öffnen und sehen, was gerade ansteht.",
      "body": "Sehen Sie, was die Immobilie braucht, wann der letzte Besuch war, was erledigt wurde, von wem, welche Fotos vorliegen und was als Nächstes ansteht.",
      "labels": [
        "Kunde",
        "Immobilie",
        "Kundenanweisung",
        "Letzter Besuch",
        "Erledigte Arbeit",
        "Verantwortlich",
        "Fotos",
        "Notiz",
        "Nächster Besuch",
        "Offen"
      ],
      "values": [
        "Villa Mar",
        "Haus 12",
        "Hecken niedrig halten, ohne den Eingang zu versperren",
        "6. Okt.",
        "Heckenschnitt + Bewässerung geprüft",
        "Daniel",
        "4",
        "Ventil im Nordbereich muss geprüft werden",
        "Donnerstag",
        "Bewässerungsventil prüfen"
      ],
      "demo": "Beispiel eines Besuchs · fiktive Daten"
    },
    "capabilities": {
      "eyebrow": "WAS SIE TUN KÖNNEN",
      "title": "Damit die Arbeit nicht vom Gedächtnis abhängt.",
      "body": "Bündeln Sie, was die beteiligten Personen für die Betreuung brauchen und was danach klar sein muss.",
      "items": [
        [
          "Kunden und Immobilien",
          "Speichern Sie Anweisungen und Details jedes Kunden und jeder Immobilie, damit Ihr Team weiß, wie sie betreut werden."
        ],
        [
          "Aufgaben und Besuche",
          "Organisieren Sie offene Arbeiten, weisen Sie Verantwortliche zu und planen Sie nächste Besuche und Wartungstermine."
        ],
        [
          "Teams und Verantwortliche",
          "Sehen Sie, wer welche Arbeit übernimmt, und verwalten Sie mit den aktivierten Funktionen Schichten, Stunden und Werkzeuge."
        ],
        [
          "Fotos, Notizen und bisherige Arbeiten",
          "Halten Sie fest, was erledigt wurde, was sich verändert hat und was noch Aufmerksamkeit braucht."
        ],
        [
          "Pflanzen, Anlagen und Geräte",
          "Prüfen Sie, welche Pflege oder Wartung jedes Element braucht und was bisher daran gemacht wurde."
        ],
        [
          "Informationen für den Kunden",
          "Teilen Sie erledigte Arbeiten über Portale, Berichte und Dokumente, je nach aktivierten Funktionen und freigegebenem Zugriff."
        ]
      ]
    },
    "differences": {
      "eyebrow": "WARUM HOMEGUIDE",
      "title": "Weniger merken. Weniger nachfragen. Einfacher weitermachen.",
      "body": "Anweisungen, Menschen und bisherige Arbeiten gehören zur selben Immobilie. Die ganze Geschichte muss nicht für jede Arbeit neu erzählt werden.",
      "items": [
        [
          "Die Informationen bleiben bei der Immobilie",
          "Anweisungen, Aufgaben, Fotos und Notizen finden Sie beim zugehörigen Ort, nicht in verstreuten Gesprächen."
        ],
        [
          "Die nächste Person weiß, wo sie weitermachen kann",
          "Sie kann frühere Arbeiten und offene Aufgaben ansehen, ohne dass jemand die ganze Geschichte erzählen muss."
        ],
        [
          "Dieselben Informationen helfen bei verschiedenen Arbeiten",
          "Aufgaben, Besuche und Kontrollen nutzen die Anweisungen und bisherigen Einträge der Immobilie, statt jedes Mal bei null anzufangen."
        ],
        [
          "Die Verwaltung sieht, was passiert",
          "Prüfen Sie Verantwortliche, erledigte Arbeiten und offene Aufgaben Ihrer Immobilien."
        ],
        [
          "Der Kunde versteht, was geleistet wurde",
          "Teilen Sie die passenden Informationen zum Service, damit der Kunde nicht bei mehreren Personen nachfragen muss."
        ],
        [
          "Frühere Einträge helfen, Fehler nicht zu wiederholen",
          "Lesen Sie frühere Probleme, Änderungen und wichtige Notizen, bevor die nächste Arbeit beginnt."
        ]
      ]
    },
    "trust": {
      "eyebrow": "PRIVATE INFORMATIONEN",
      "title": "Jede Person sieht, was sie für ihre Arbeit braucht.",
      "body": "Verwalten Sie den Zugriff der beteiligten Personen und entscheiden Sie, welche Informationen Sie mit dem Kunden teilen.",
      "items": [
        [
          "Zugriff passend zur Arbeit",
          "Eigentümer, Verwaltung und Teams haben je nach Rolle und zugewiesenen Aufgaben unterschiedliche Werkzeuge und Zugriffe."
        ],
        [
          "Sie entscheiden, was Sie teilen",
          "Das Kundenportal zeigt die Bereiche, die Sie freigeben. Interne Notizen sind nicht im Kundenportal enthalten."
        ],
        [
          "Eine hilfreiche Übersicht bisheriger Arbeiten",
          "Besuche und abgeschlossene Arbeiten halten Fotos, Notizen, Verantwortliche und Termine fest, damit Sie später nachsehen können, was passiert ist."
        ]
      ]
    },
    "pricing": {
      "eyebrow": "PREISE",
      "title": "Wählen Sie Ihre Immobilienanzahl und die Funktionen für Ihr Team.",
      "body": "Eine Immobilie ist ein konkreter Ort, den Sie betreuen: ein Haus, eine Villa, eine Wohnanlage oder ein anderer Kundenstandort. Optionale Funktionen werden pro Konto berechnet, nicht pro Immobilie.",
      "monthly": "Monatlich",
      "annual": "Jährlich",
      "annualNote": "10 Monate zahlen, 12 nutzen",
      "properties": "Immobilien",
      "perProperty": "pro Immobilie / Monat",
      "extras": "Optionale Funktionen",
      "extrasBody": "Neun optionale Funktionen zum Preis pro Konto. Wählen Sie nur, was Ihr Team braucht.",
      "groupOperation": "Betrieb",
      "groupOperationBody": "Organisieren Sie die Arbeit, Stunden und nächsten Aufgaben Ihres Teams.",
      "groupManagement": "Verwaltung",
      "groupManagementBody": "Verwalten Sie Werkzeuge, Kundeninformationen, Dokumente und Abrechnung.",
      "groupAnalysis": "Analyse",
      "groupAnalysisBody": "Prüfen Sie Gelände und Gefälle mit Topografiewerkzeugen.",
      "groupSpecialized": "Spezialisiert",
      "groupSpecializedBody": "Pflege für die betreuten Pflanzen. Verkauf, Vermietung oder Austausch hängen von Ihrer Einrichtung ab, nicht von einer separaten Gebühr.",
      "accountMonth": "Konto / Monat",
      "summary": "Ihre Schätzung",
      "dueMonthly": "pro Monat",
      "dueAnnual": "jährlich berechnet",
      "saving": "Ersparnis",
      "continue": "Konto erstellen und fortfahren",
      "included": "Grundlage jedes Kontos",
      "includedItems": [
        "Kunden, Immobilien und Anlagen",
        "Aufgaben, Protokolle und Berichte",
        "Oberfläche EN, ES und DE",
        "Anzeige in USD und CRC"
      ],
      "decrease": "Immobilien reduzieren",
      "increase": "Immobilien erhöhen",
      "catalogTitle": "Weitere Werkzeuge für die Arbeit Ihres Teams",
      "catalogBody": "Sehen Sie sich die verfügbaren Werkzeuge an und wählen Sie, was Sie für Ihre Immobilien brauchen.",
      "catalogNote": "Die Verfügbarkeit hängt von den aktivierten Funktionen und Einstellungen ab.",
      "capabilityCore": "Kunden, Immobilien und Dokumente",
      "capabilityField": "Besuche, Aufgaben und Teams",
      "capabilityCare": "Pflege und nächste Termine",
      "capabilityAdmin": "Kundeninformationen und Verwaltung",
      "addon_field_operations": "Besuche, Verantwortliche, Fotos und Notizen zur erledigten Arbeit.",
      "addon_labor": "Schichten, Stunden und Tarife des Teams, auch für Reinigungsroutinen.",
      "addon_reminders": "Erinnerungen an Aufgaben, Wartung und nächste Termine.",
      "addon_inventory": "Werkzeuge und Materialien, die Ihr Team bei der Arbeit nutzt.",
      "addon_client_portal": "Teilen Sie die Informationen, die Sie im jeweiligen Kundenportal freigeben.",
      "addon_reports_manuals": "Arbeitsberichte und Handbücher zum Nachschlagen und Teilen.",
      "addon_topography": "Prüfen Sie Höhen und Gefälle des Geländes.",
      "addon_financials": "Organisieren Sie Ausgaben, Rechnungen und Zahlungseinträge.",
      "addon_plant_care": "Sehen Sie Pflegehinweise, Termine und Empfehlungen für jede Pflanze."
    },
    "faq": {
      "eyebrow": "HÄUFIGE FRAGEN",
      "title": "Fragen vor dem nächsten Besuch",
      "items": [
        [
          "Ist HomeGuide nur für Gartenpflege?",
          "Nein. HomeGuide bündelt Arbeit und Informationen rund um die Immobilie für Eigentümer, Verwaltung, Dienstleister und Mitarbeitende. Es hilft bei Instandhaltung und anderen Arbeiten, regelmäßig oder einmalig."
        ],
        [
          "Was passiert, wenn eine neue Person die Betreuung übernimmt?",
          "Anweisungen, Aufgaben, Fotos und Notizen bleiben bei der Immobilie. Mit dem passenden Zugriff kann die neue Person sehen, was erledigt wurde und was noch offen ist."
        ],
        [
          "Kann ich Fotos und Notizen zu jedem Besuch speichern?",
          "Ja. Sie können Fotos und Notizen zu Besuchen und abgeschlossenen Arbeiten festhalten und später bei der jeweiligen Immobilie wiederfinden."
        ],
        [
          "Kann der Kunde sehen, was erledigt wurde?",
          "Ja, wenn Sie das Kundenportal und die gewünschten Bereiche freigeben. Die Verfügbarkeit hängt von den aktivierten Funktionen und eingerichteten Zugriffsrechten ab."
        ],
        [
          "Kann ich mehrere Immobilien und Kunden verwalten?",
          "Ja. Sie können mehrere Kunden und deren betreute Immobilien organisieren. Der Grundpreis gilt pro Immobilie; optionale Funktionen werden pro Konto berechnet."
        ],
        [
          "Ist es nur für Pflanzen?",
          "Nein. Pflanzenpflege ist optional. Sie können auch Instandhaltung, Aufgaben, Besuche und Arbeiten an anderen Teilen einer Immobilie organisieren."
        ]
      ]
    },
    "final": {
      "title": "Damit der nächste Besuch nicht bei null beginnt.",
      "body": "Organisieren Sie jede Immobilie, machen Sie die Aufgaben klar und halten Sie fest, was Ihr Team bereits erledigt hat.",
      "create": "Konto erstellen",
      "signIn": "Anmelden"
    },
    "footer": "Was jede Immobilie braucht, was erledigt wurde und was als Nächstes ansteht."
  }
};
